import type { Prisma } from "@prisma/client";
import { findActiveMaterialsWithReorderPoint, findMaterialById, findMaterials } from "../repositories/materialRepository.js";
import {
  countIssues,
  findIssueItemsForSummary,
  findIssues,
  groupIssuesByStatus,
} from "../repositories/materialIssueRepository.js";
import {
  findIssueTransactionsForCosting,
  findTransactionsForCostReplay,
  groupBalanceByMaterial,
  groupBalanceByMaterialWarehouse,
  groupIssuedQuantityByMaterial,
} from "../repositories/stockTransactionRepository.js";
import { findWarehousesByIds } from "../repositories/warehouseRepository.js";
import type { IssueHistoryQuery, StockValueQuery } from "../validation/reportingSchema.js";
import { assertWarehouseAccessible } from "./accessControlService.js";

export interface CostReplayInput {
  quantityChange: Prisma.Decimal | number;
  unitCost: Prisma.Decimal | number;
}

/** Issues don't move the average cost — only inbound transactions (RECEIVE/RETURN/TRANSFER_IN/positive ADJUSTMENT) do. */
export function replayWeightedAverageCost(transactions: CostReplayInput[]): { balance: number; avgCost: number } {
  let balance = 0;
  let avgCost = 0;
  for (const tx of transactions) {
    const qty = Number(tx.quantityChange);
    if (qty > 0) {
      const unitCost = Number(tx.unitCost);
      const newBalance = balance + qty;
      avgCost = newBalance !== 0 ? (balance * avgCost + qty * unitCost) / newBalance : 0;
      balance = newBalance;
    } else {
      balance += qty;
    }
  }
  return { balance, avgCost };
}

export async function getStockValueReport(query: StockValueQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return { items: [], totalValue: 0, valueByWarehouse: [] };
  }

  let materialIdCondition: string | { in: string[] } | undefined = query.materialId;
  if (!materialIdCondition && query.categoryId) {
    const materialsInCategory = await findMaterials({ categoryId: query.categoryId }, 0, 10000);
    if (materialsInCategory.length === 0) {
      return { items: [], totalValue: 0, valueByWarehouse: [] };
    }
    materialIdCondition = { in: materialsInCategory.map((m) => m.id) };
  }

  const where: Prisma.StockTransactionWhereInput = {
    ...(query.warehouseId
      ? { warehouseId: query.warehouseId }
      : accessibleWarehouseIds
        ? { warehouseId: { in: accessibleWarehouseIds } }
        : {}),
    ...(materialIdCondition ? { materialId: materialIdCondition } : {}),
  };

  const groups = await groupBalanceByMaterialWarehouse(where);
  const nonZeroGroups = groups.filter((group) => Number(group._sum.quantityChange ?? 0) !== 0);

  const items = await Promise.all(
    nonZeroGroups.map(async (group) => {
      const [material, transactions] = await Promise.all([
        findMaterialById(group.materialId),
        findTransactionsForCostReplay(group.materialId, group.warehouseId),
      ]);
      const { balance, avgCost } = replayWeightedAverageCost(transactions);
      return {
        materialId: group.materialId,
        materialCode: material?.code ?? null,
        materialName: material?.name ?? null,
        warehouseId: group.warehouseId,
        balance,
        avgCost,
        value: balance * avgCost,
      };
    }),
  );

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  const valueByWarehouseMap = new Map<string, number>();
  for (const item of items) {
    valueByWarehouseMap.set(item.warehouseId, (valueByWarehouseMap.get(item.warehouseId) ?? 0) + item.value);
  }

  return {
    items,
    totalValue,
    valueByWarehouse: Array.from(valueByWarehouseMap, ([warehouseId, value]) => ({ warehouseId, value })),
  };
}

export async function getIssueHistoryReport(query: IssueHistoryQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return { items: [], total: 0, page: query.page, limit: query.limit, summary: { totalIssuedValue: 0, countByStatus: {} } };
  }

  const where: Prisma.MaterialIssueWhereInput = {
    ...(query.warehouseId
      ? { warehouseId: query.warehouseId }
      : accessibleWarehouseIds
        ? { warehouseId: { in: accessibleWarehouseIds } }
        : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total, statusGroups, summaryItems] = await Promise.all([
    findIssues(where, skip, query.limit),
    countIssues(where),
    groupIssuesByStatus(where),
    findIssueItemsForSummary(where),
  ]);

  const countByStatus = Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all]));
  const totalIssuedValue = summaryItems.reduce(
    (sum, item) => sum + Number(item.issuedQty ?? 0) * Number(item.unitCost),
    0,
  );

  return { items, total, page: query.page, limit: query.limit, summary: { totalIssuedValue, countByStatus } };
}

async function getMonthlyIssueTrend(accessibleWarehouseIds: string[] | null, months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const where: Prisma.MaterialIssueWhereInput = {
    createdAt: { gte: start },
    ...(accessibleWarehouseIds ? { warehouseId: { in: accessibleWarehouseIds } } : {}),
  };
  const issues = await findIssues(where, 0, 10000);

  const buckets = new Map<string, { count: number; value: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { count: 0, value: 0 });
  }

  for (const issue of issues) {
    const key = `${issue.createdAt.getFullYear()}-${String(issue.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    for (const item of issue.items) {
      bucket.value += Number(item.issuedQty ?? 0) * Number(item.unitCost);
    }
  }

  return Array.from(buckets, ([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month));
}

async function getTopIssuedMaterials(accessibleWarehouseIds: string[] | null, limit = 5) {
  const where: Prisma.StockTransactionWhereInput = accessibleWarehouseIds
    ? { warehouseId: { in: accessibleWarehouseIds } }
    : {};
  const groups = await groupIssuedQuantityByMaterial(where, limit);
  const materials = await Promise.all(groups.map((group) => findMaterialById(group.materialId)));

  // Remaining balance across the same accessible warehouses (ledger-wide, not just issues).
  const balanceGroups = await groupBalanceByMaterial({
    ...where,
    materialId: { in: groups.map((group) => group.materialId) },
  });
  const balanceByMaterialId = new Map(
    balanceGroups.map((group) => [group.materialId, Number(group._sum.quantityChange ?? 0)]),
  );

  return groups.map((group, index) => ({
    materialId: group.materialId,
    materialCode: materials[index]?.code ?? null,
    materialName: materials[index]?.name ?? null,
    issuedQty: Math.abs(Number(group._sum.quantityChange ?? 0)),
    remainingQty: balanceByMaterialId.get(group.materialId) ?? 0,
  }));
}

async function getTopCostSites(accessibleWarehouseIds: string[] | null, limit = 5) {
  const where: Prisma.StockTransactionWhereInput = accessibleWarehouseIds
    ? { warehouseId: { in: accessibleWarehouseIds } }
    : {};
  const transactions = await findIssueTransactionsForCosting(where);

  const costByWarehouse = new Map<string, number>();
  for (const tx of transactions) {
    const cost = Math.abs(Number(tx.quantityChange)) * Number(tx.unitCost);
    costByWarehouse.set(tx.warehouseId, (costByWarehouse.get(tx.warehouseId) ?? 0) + cost);
  }

  const warehouses = await findWarehousesByIds(Array.from(costByWarehouse.keys()));
  const nameById = new Map(warehouses.map((w) => [w.id, w.name]));

  return Array.from(costByWarehouse, ([warehouseId, cost]) => ({
    warehouseId,
    warehouseName: nameById.get(warehouseId) ?? null,
    cost,
  }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}

async function getLowStockMaterials(accessibleWarehouseIds: string[] | null) {
  const materials = await findActiveMaterialsWithReorderPoint();
  if (materials.length === 0) {
    return [];
  }

  const where: Prisma.StockTransactionWhereInput = {
    materialId: { in: materials.map((m) => m.id) },
    ...(accessibleWarehouseIds ? { warehouseId: { in: accessibleWarehouseIds } } : {}),
  };
  const groups = await groupBalanceByMaterialWarehouse(where);
  const materialById = new Map(materials.map((m) => [m.id, m]));

  return groups.flatMap((group) => {
    const material = materialById.get(group.materialId);
    if (!material || material.reorderPoint === null) {
      return [];
    }
    const balance = Number(group._sum.quantityChange ?? 0);
    const reorderPoint = Number(material.reorderPoint);
    if (balance >= reorderPoint) {
      return [];
    }
    return [
      {
        materialId: material.id,
        materialName: material.name,
        warehouseId: group.warehouseId,
        balance,
        reorderPoint,
      },
    ];
  });
}

export async function getExecutiveDashboard(accessibleWarehouseIds: string[] | null) {
  const [stockValue, monthlyIssueTrend, topIssuedMaterials, topCostSites, lowStockMaterials] = await Promise.all([
    getStockValueReport({}, accessibleWarehouseIds),
    getMonthlyIssueTrend(accessibleWarehouseIds),
    getTopIssuedMaterials(accessibleWarehouseIds),
    getTopCostSites(accessibleWarehouseIds),
    getLowStockMaterials(accessibleWarehouseIds),
  ]);

  return {
    totalStockValue: stockValue.totalValue,
    stockValueByWarehouse: stockValue.valueByWarehouse,
    monthlyIssueTrend,
    topIssuedMaterials,
    topCostSites,
    lowStockMaterials,
  };
}
