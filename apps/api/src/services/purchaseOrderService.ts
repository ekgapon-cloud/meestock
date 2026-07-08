import type { POStatus, Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError.js";
import { createWithDocNoRetry } from "../lib/docNoRetry.js";
import { extractDocNoSuffix } from "../lib/docNoSequence.js";
import { findMaterialById } from "../repositories/materialRepository.js";
import {
  countPurchaseOrders,
  createPurchaseOrder,
  findLatestDocNoWithPrefix,
  findPurchaseOrderById,
  findPurchaseOrders,
  updatePurchaseOrder,
} from "../repositories/purchaseOrderRepository.js";
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  UpdatePurchaseOrderStatusInput,
} from "../validation/purchaseOrderSchema.js";

const ALLOWED_TRANSITIONS: Record<POStatus, POStatus[]> = {
  DRAFT: ["ORDERED", "CANCELLED"],
  ORDERED: ["CANCELLED"],
  PARTIALLY_RECEIVED: [],
  RECEIVED: [],
  CANCELLED: [],
};

function buildWhere(query: ListPurchaseOrdersQuery): Prisma.PurchaseOrderWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  };
}

export async function listPurchaseOrders(query: ListPurchaseOrdersQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    findPurchaseOrders(where, skip, query.limit),
    countPurchaseOrders(where),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}

export async function getPurchaseOrder(id: string) {
  const po = await findPurchaseOrderById(id);
  if (!po) {
    throw new AppError("NOT_FOUND", "Purchase order not found");
  }
  return po;
}

async function generateDocNo(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `PO-${datePart}-`;
  const latestDocNo = await findLatestDocNoWithPrefix(prefix);
  const latestSuffix = latestDocNo ? extractDocNoSuffix(latestDocNo, prefix) : 0;
  return `${prefix}${String(latestSuffix + 1).padStart(4, "0")}`;
}

export async function createPurchaseOrderWithValidation(
  input: CreatePurchaseOrderInput,
  createdById: string,
  ipAddress: string | undefined,
) {
  const materials = await Promise.all(input.items.map((item) => findMaterialById(item.materialId)));
  const itemsData: Prisma.PurchaseOrderItemUncheckedCreateWithoutPurchaseOrderInput[] = input.items.map(
    (item, index) => {
      const material = materials[index];
      if (!material) {
        throw new AppError("NOT_FOUND", `Material ${item.materialId} not found`);
      }
      return {
        materialId: item.materialId,
        orderedQty: item.orderedQty,
        unitCost: item.unitCost,
      };
    },
  );

  return createWithDocNoRetry(async () => {
    const docNo = await generateDocNo();
    return createPurchaseOrder({
      docNo,
      supplier: { connect: { id: input.supplierId } },
      createdBy: { connect: { id: createdById } },
      ...(ipAddress ? { ipAddress } : {}),
      items: { create: itemsData },
    });
  });
}

export async function updatePurchaseOrderStatus(id: string, input: UpdatePurchaseOrderStatusInput) {
  const po = await findPurchaseOrderById(id);
  if (!po) {
    throw new AppError("NOT_FOUND", "Purchase order not found");
  }

  if (!ALLOWED_TRANSITIONS[po.status].includes(input.status)) {
    throw new AppError(
      "INVALID_WORKFLOW_STATE",
      `Cannot transition purchase order from ${po.status} to ${input.status}`,
    );
  }

  return updatePurchaseOrder(id, { status: input.status });
}
