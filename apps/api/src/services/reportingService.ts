import type { Prisma } from "@prisma/client";
import { findActiveMaterialsWithReorderPoint, findMaterialById, findMaterials } from "../repositories/materialRepository.js";
import {
  countIssues,
  findIssueItemsForSummary,
  findIssues,
  groupIssuesByStatus,
} from "../repositories/materialIssueRepository.js";
import { countGoodsReceives } from "../repositories/goodsReceiveRepository.js";
import {
  findTransactionsByTypeForCosting,
  findTransactionsForCostReplay,
  groupBalanceByMaterial,
  groupBalanceByMaterialWarehouse,
  groupIssuedQuantityByMaterial,
} from "../repositories/stockTransactionRepository.js";
import { findWarehouses, findWarehousesByIds } from "../repositories/warehouseRepository.js";
import type { IssueHistoryQuery, SiteFinancialSummaryQuery, StockValueQuery } from "../validation/reportingSchema.js";
import { assertWarehouseAccessible } from "./accessControlService.js";
import { computeIsOverdue } from "./materialIssueService.js";

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
  const transactions = await findTransactionsByTypeForCosting(where, "ISSUE");

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

export async function getLowStockMaterials(accessibleWarehouseIds: string[] | null, warehouseId?: string) {
  if (warehouseId) {
    assertWarehouseAccessible(warehouseId, accessibleWarehouseIds);
  }
  const materials = await findActiveMaterialsWithReorderPoint();
  if (materials.length === 0) {
    return [];
  }

  const where: Prisma.StockTransactionWhereInput = {
    materialId: { in: materials.map((m) => m.id) },
    ...(warehouseId
      ? { warehouseId }
      : accessibleWarehouseIds
        ? { warehouseId: { in: accessibleWarehouseIds } }
        : {}),
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

export async function getSiteFinancialSummary(
  accessibleWarehouseIds: string[] | null,
  query: SiteFinancialSummaryQuery = {},
) {
  const baseWhere: Prisma.WarehouseWhereInput = accessibleWarehouseIds ? { id: { in: accessibleWarehouseIds } } : {};
  const dateFilter: Prisma.StockTransactionWhereInput =
    query.dateFrom || query.dateTo
      ? { date: { ...(query.dateFrom ? { gte: query.dateFrom } : {}), ...(query.dateTo ? { lte: query.dateTo } : {}) } }
      : {};
  const txWhere: Prisma.StockTransactionWhereInput = accessibleWarehouseIds
    ? { warehouseId: { in: accessibleWarehouseIds } }
    : {};

  const [warehouses, stockValue, issuedTransactions, receivedTransactions, lowStockMaterials] = await Promise.all([
    findWarehouses(baseWhere),
    getStockValueReport({}, accessibleWarehouseIds),
    findTransactionsByTypeForCosting({ ...txWhere, ...dateFilter }, "ISSUE"),
    findTransactionsByTypeForCosting({ ...txWhere, ...dateFilter }, "RECEIVE"),
    getLowStockMaterials(accessibleWarehouseIds),
  ]);

  const remainingValueByWarehouse = new Map(stockValue.valueByWarehouse.map((row) => [row.warehouseId, row.value]));

  const issuedValueByWarehouse = new Map<string, number>();
  for (const tx of issuedTransactions) {
    const cost = Math.abs(Number(tx.quantityChange)) * Number(tx.unitCost);
    issuedValueByWarehouse.set(tx.warehouseId, (issuedValueByWarehouse.get(tx.warehouseId) ?? 0) + cost);
  }

  const receivedValueByWarehouse = new Map<string, number>();
  for (const tx of receivedTransactions) {
    const cost = Math.abs(Number(tx.quantityChange)) * Number(tx.unitCost);
    receivedValueByWarehouse.set(tx.warehouseId, (receivedValueByWarehouse.get(tx.warehouseId) ?? 0) + cost);
  }

  const lowStockCountByWarehouse = new Map<string, number>();
  for (const row of lowStockMaterials) {
    lowStockCountByWarehouse.set(row.warehouseId, (lowStockCountByWarehouse.get(row.warehouseId) ?? 0) + 1);
  }

  const sites = warehouses.map((warehouse) => {
    const remainingValue = remainingValueByWarehouse.get(warehouse.id) ?? 0;
    const issuedValue = issuedValueByWarehouse.get(warehouse.id) ?? 0;
    const materialBudget = warehouse.project?.materialBudget ? Number(warehouse.project.materialBudget) : null;
    return {
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      projectId: warehouse.project?.id ?? null,
      projectName: warehouse.project?.name ?? null,
      projectCode: warehouse.project?.code ?? null,
      contractValue: warehouse.project ? Number(warehouse.project.contractValue) : null,
      materialBudget,
      remainingValue,
      issuedValue,
      receivedValue: receivedValueByWarehouse.get(warehouse.id) ?? 0,
      lowStockCount: lowStockCountByWarehouse.get(warehouse.id) ?? 0,
      budgetUtilizationPct: materialBudget && materialBudget > 0 ? (issuedValue / materialBudget) * 100 : null,
    };
  });

  const totals = sites.reduce(
    (acc, site) => ({
      totalRemainingValue: acc.totalRemainingValue + site.remainingValue,
      totalIssuedValue: acc.totalIssuedValue + site.issuedValue,
      totalReceivedValue: acc.totalReceivedValue + site.receivedValue,
      totalLowStockCount: acc.totalLowStockCount + site.lowStockCount,
    }),
    { totalRemainingValue: 0, totalIssuedValue: 0, totalReceivedValue: 0, totalLowStockCount: 0 },
  );

  return {
    sites: sites.sort((a, b) => b.remainingValue - a.remainingValue),
    totals,
    dateFrom: query.dateFrom?.toISOString() ?? null,
    dateTo: query.dateTo?.toISOString() ?? null,
  };
}

/**
 * Stock value distributed across SITE warehouses whose linked project hasn't finished yet
 * (status PLANNING or IN_PROGRESS) — feeds the executive dashboard's donut chart. Warehouses
 * with no project (CENTRAL/TEMPORARY) or a COMPLETED/CANCELLED project are excluded, since
 * "ยังไม่จบโครงการ" (not yet finished) is exactly PLANNING|IN_PROGRESS.
 */
export async function getActiveProjectValueBreakdown(accessibleWarehouseIds: string[] | null) {
  const baseWhere: Prisma.WarehouseWhereInput = accessibleWarehouseIds ? { id: { in: accessibleWarehouseIds } } : {};
  const [warehouses, stockValue] = await Promise.all([
    findWarehouses(baseWhere),
    getStockValueReport({}, accessibleWarehouseIds),
  ]);

  const valueByWarehouse = new Map(stockValue.valueByWarehouse.map((row) => [row.warehouseId, row.value]));

  const activeSites = warehouses
    .filter((w) => w.project && (w.project.status === "PLANNING" || w.project.status === "IN_PROGRESS"))
    .map((w) => ({
      warehouseId: w.id,
      warehouseName: w.name,
      projectId: w.project!.id,
      projectCode: w.project!.code,
      projectName: w.project!.name,
      status: w.project!.status,
      startDate: w.project!.startDate.toISOString(),
      endDate: w.project!.endDate ? w.project!.endDate.toISOString() : null,
      value: valueByWarehouse.get(w.id) ?? 0,
    }));

  const totalValue = activeSites.reduce((sum, site) => sum + site.value, 0);

  return {
    totalValue,
    sites: activeSites
      .map((site) => ({ ...site, percentage: totalValue > 0 ? (site.value / totalValue) * 100 : 0 }))
      .sort((a, b) => b.value - a.value),
  };
}

/**
 * Same breakdown as `getActiveProjectValueBreakdown`, but strips `value`/`totalValue` — the
 * absolute money figures STAFF accessLevel must never see (see costVisibilityService) — leaving
 * only `percentage`, which the user explicitly asked to allow STAFF to view. Percentage alone
 * doesn't reveal the underlying currency amount, unlike the executive version.
 */
export async function getActiveProjectValuePercentageBreakdown(accessibleWarehouseIds: string[] | null) {
  const breakdown = await getActiveProjectValueBreakdown(accessibleWarehouseIds);
  return {
    sites: breakdown.sites.map(({ value: _value, ...rest }) => rest),
  };
}

export async function getExecutiveDashboard(accessibleWarehouseIds: string[] | null) {
  const [stockValue, monthlyIssueTrend, topIssuedMaterials, topCostSites, lowStockMaterials, activeProjectValueBreakdown] =
    await Promise.all([
      getStockValueReport({}, accessibleWarehouseIds),
      getMonthlyIssueTrend(accessibleWarehouseIds),
      getTopIssuedMaterials(accessibleWarehouseIds),
      getTopCostSites(accessibleWarehouseIds),
      getLowStockMaterials(accessibleWarehouseIds),
      getActiveProjectValueBreakdown(accessibleWarehouseIds),
    ]);

  return {
    totalStockValue: stockValue.totalValue,
    stockValueByWarehouse: stockValue.valueByWarehouse,
    monthlyIssueTrend,
    topIssuedMaterials,
    topCostSites,
    lowStockMaterials,
    activeProjectValueBreakdown,
  };
}

async function getTopIssuedMaterialsSince(accessibleWarehouseIds: string[] | null, since: Date, limit = 5) {
  const where: Prisma.StockTransactionWhereInput = {
    date: { gte: since },
    ...(accessibleWarehouseIds ? { warehouseId: { in: accessibleWarehouseIds } } : {}),
  };
  const groups = await groupIssuedQuantityByMaterial(where, limit);
  const materials = await Promise.all(groups.map((group) => findMaterialById(group.materialId)));

  return groups.map((group, index) => ({
    materialId: group.materialId,
    materialCode: materials[index]?.code ?? null,
    materialName: materials[index]?.name ?? null,
    issuedQty: Math.abs(Number(group._sum.quantityChange ?? 0)),
  }));
}

/**
 * The general-purpose dashboard for every authenticated user (unlike /dashboard/executive,
 * gated to role EXECUTIVE + accessLevel MANAGER/ADMIN) — deliberately excludes every cost/value
 * field so it's safe for STAFF accessLevel to see (see costVisibilityService), and windows
 * everything to the trailing week/month rather than all-time totals. The one exception is
 * `activeProjectValueBreakdown`, which STAFF is explicitly allowed to see as a percentage-only
 * share (no currency figure, via `getActiveProjectValuePercentageBreakdown`).
 */
export async function getStaffDashboard(accessibleWarehouseIds: string[] | null) {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const issueWarehouseFilter: Prisma.MaterialIssueWhereInput = accessibleWarehouseIds
    ? { warehouseId: { in: accessibleWarehouseIds } }
    : {};
  const receiveWarehouseFilter: Prisma.GoodsReceiveWhereInput = accessibleWarehouseIds
    ? { warehouseId: { in: accessibleWarehouseIds } }
    : {};

  const [
    issuesThisWeek,
    issuesThisMonth,
    receivesThisWeek,
    receivesThisMonth,
    issueStatusGroups,
    topIssuedMaterialsThisWeek,
    topIssuedMaterialsThisMonth,
    lowStockMaterials,
    openIssues,
    activeProjectValueBreakdown,
  ] = await Promise.all([
    countIssues({ ...issueWarehouseFilter, createdAt: { gte: weekStart } }),
    countIssues({ ...issueWarehouseFilter, createdAt: { gte: monthStart } }),
    countGoodsReceives({ ...receiveWarehouseFilter, createdAt: { gte: weekStart } }),
    countGoodsReceives({ ...receiveWarehouseFilter, createdAt: { gte: monthStart } }),
    groupIssuesByStatus({ ...issueWarehouseFilter, createdAt: { gte: monthStart } }),
    getTopIssuedMaterialsSince(accessibleWarehouseIds, weekStart),
    getTopIssuedMaterialsSince(accessibleWarehouseIds, monthStart),
    getLowStockMaterials(accessibleWarehouseIds),
    findIssues({ ...issueWarehouseFilter, status: { in: ["PENDING_APPROVAL", "APPROVED"] } }, 0, 10000),
    getActiveProjectValuePercentageBreakdown(accessibleWarehouseIds),
  ]);

  const overdueIssuesCount = openIssues.filter((issue) => computeIsOverdue(issue)).length;

  return {
    weekStart: weekStart.toISOString(),
    monthStart: monthStart.toISOString(),
    issuesThisWeek,
    issuesThisMonth,
    receivesThisWeek,
    receivesThisMonth,
    issueStatusBreakdownThisMonth: Object.fromEntries(
      issueStatusGroups.map((group) => [group.status, group._count._all]),
    ),
    topIssuedMaterialsThisWeek,
    topIssuedMaterialsThisMonth,
    lowStockCount: lowStockMaterials.length,
    lowStockMaterials,
    overdueIssuesCount,
    activeProjectValueBreakdown,
  };
}
