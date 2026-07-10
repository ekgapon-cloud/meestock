import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { AppError } from "../errors/AppError.js";
import { createWithDocNoRetry } from "../lib/docNoRetry.js";
import { extractDocNoSuffix } from "../lib/docNoSequence.js";
import { findMaterialById } from "../repositories/materialRepository.js";
import {
  countIssues,
  createApproval,
  createIssue,
  findIssueById,
  findIssues,
  findLatestDocNoWithPrefix,
  groupIssuesByStatus,
  runInTransaction,
  updateIssue,
  updateIssueItem,
} from "../repositories/materialIssueRepository.js";
import { createTransaction, sumQuantityChange } from "../repositories/stockTransactionRepository.js";
import type {
  ApproveMaterialIssueInput,
  CreateMaterialIssueInput,
  FulfillMaterialIssueInput,
  ListMaterialIssuesQuery,
  RejectMaterialIssueInput,
} from "../validation/materialIssueSchema.js";
import { assertWarehouseAccessible } from "./accessControlService.js";
import { assertProjectAcceptsIssues } from "./projectService.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * SLA is a badge-only concept (no notifications exist in this app) — derived purely from
 * existing timestamps at read time, so it never needed a schema migration. PENDING_APPROVAL
 * ages off `createdAt`; APPROVED ages off `approval.approvedAt`. Terminal states are never overdue.
 */
export function computeIsOverdue<
  T extends { status: string; createdAt: Date; approval: { approvedAt: Date | null } | null },
>(issue: T): boolean {
  const now = Date.now();
  if (issue.status === "PENDING_APPROVAL") {
    return now > issue.createdAt.getTime() + env.MATERIAL_ISSUE_APPROVAL_SLA_HOURS * HOUR_MS;
  }
  if (issue.status === "APPROVED" && issue.approval?.approvedAt) {
    return now > issue.approval.approvedAt.getTime() + env.MATERIAL_ISSUE_FULFILLMENT_SLA_DAYS * DAY_MS;
  }
  return false;
}

function withOverdueFlag<
  T extends { status: string; createdAt: Date; approval: { approvedAt: Date | null } | null },
>(issue: T): T & { isOverdue: boolean } {
  return { ...issue, isOverdue: computeIsOverdue(issue) };
}

function buildWhere(
  query: ListMaterialIssuesQuery,
  accessibleWarehouseIds: string[] | null,
): Prisma.MaterialIssueWhereInput {
  return {
    ...(query.warehouseId
      ? { warehouseId: query.warehouseId }
      : accessibleWarehouseIds
        ? { warehouseId: { in: accessibleWarehouseIds } }
        : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };
}

export async function listMaterialIssues(query: ListMaterialIssuesQuery, accessibleWarehouseIds: string[] | null) {
  if (query.warehouseId) {
    assertWarehouseAccessible(query.warehouseId, accessibleWarehouseIds);
  }
  if (accessibleWarehouseIds !== null && accessibleWarehouseIds.length === 0) {
    return { items: [], total: 0, page: query.page, limit: query.limit, summary: { countByStatus: {} } };
  }

  const where = buildWhere(query, accessibleWarehouseIds);
  const skip = (query.page - 1) * query.limit;
  const [items, total, statusGroups] = await Promise.all([
    findIssues(where, skip, query.limit),
    countIssues(where),
    groupIssuesByStatus(where),
  ]);
  const countByStatus = Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all]));

  return {
    items: items.map(withOverdueFlag),
    total,
    page: query.page,
    limit: query.limit,
    summary: { countByStatus },
  };
}

export async function getMaterialIssue(id: string, accessibleWarehouseIds: string[] | null) {
  const issue = await findIssueById(id);
  if (!issue) {
    throw new AppError("NOT_FOUND", "Material issue not found");
  }
  assertWarehouseAccessible(issue.warehouseId, accessibleWarehouseIds);
  return withOverdueFlag(issue);
}

async function generateDocNo(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `MI-${datePart}-`;
  const latestDocNo = await findLatestDocNoWithPrefix(prefix);
  const latestSuffix = latestDocNo ? extractDocNoSuffix(latestDocNo, prefix) : 0;
  return `${prefix}${String(latestSuffix + 1).padStart(4, "0")}`;
}

export async function createMaterialIssue(
  input: CreateMaterialIssueInput,
  requesterId: string,
  ipAddress: string | undefined,
  accessibleWarehouseIds: string[] | null,
) {
  assertWarehouseAccessible(input.warehouseId, accessibleWarehouseIds);
  // A closed (COMPLETED/CANCELLED) project can't consume more stock.
  await assertProjectAcceptsIssues(input.projectId);

  const materials = await Promise.all(input.items.map((item) => findMaterialById(item.materialId)));
  const itemsData: Prisma.MaterialIssueItemUncheckedCreateWithoutMaterialIssueInput[] = input.items.map((item, index) => {
    const material = materials[index];
    if (!material) {
      throw new AppError("NOT_FOUND", `Material ${item.materialId} not found`);
    }
    if (!material.isActive) {
      throw new AppError("VALIDATION_ERROR", `Material ${item.materialId} is inactive`);
    }
    return {
      materialId: item.materialId,
      requestedQty: item.requestedQty,
      unitCost: material.standardCost,
    };
  });

  const issue = await createWithDocNoRetry(async () => {
    const docNo = await generateDocNo();
    return createIssue({
      docNo,
      project: { connect: { id: input.projectId } },
      warehouse: { connect: { id: input.warehouseId } },
      requester: { connect: { id: requesterId } },
      ...(ipAddress ? { ipAddress } : {}),
      items: { create: itemsData },
    });
  });
  return withOverdueFlag(issue);
}

export async function approveMaterialIssue(
  issueId: string,
  approverId: string,
  input: ApproveMaterialIssueInput,
  accessibleWarehouseIds: string[] | null,
) {
  const issue = await findIssueById(issueId);
  if (!issue) {
    throw new AppError("NOT_FOUND", "Material issue not found");
  }
  assertWarehouseAccessible(issue.warehouseId, accessibleWarehouseIds);

  if (issue.status !== "PENDING_APPROVAL") {
    throw new AppError("INVALID_WORKFLOW_STATE", "Issue must be in PENDING_APPROVAL to approve");
  }
  if (issue.requesterId === approverId) {
    throw new AppError("FORBIDDEN_SELF_APPROVAL", "Requester cannot approve their own request");
  }

  const overrideByMaterialId = new Map((input.items ?? []).map((item) => [item.materialId, item.approvedQty]));

  return runInTransaction(async (tx) => {
    const approval = await createApproval(
      {
        approver: { connect: { id: approverId } },
        status: "APPROVED",
        approvedAt: new Date(),
        ...(input.note ? { note: input.note } : {}),
      },
      tx,
    );

    for (const item of issue.items) {
      const override = overrideByMaterialId.get(item.materialId);
      const requestedQty = Number(item.requestedQty);
      const approvedQty = override ?? requestedQty;
      if (approvedQty > requestedQty) {
        throw new AppError("VALIDATION_ERROR", `approvedQty for material ${item.materialId} cannot exceed requestedQty`);
      }
      await updateIssueItem(item.id, { approvedQty }, tx);
    }

    const updated = await updateIssue(issueId, { status: "APPROVED", approval: { connect: { id: approval.id } } }, tx);
    return withOverdueFlag(updated);
  });
}

export async function rejectMaterialIssue(
  issueId: string,
  approverId: string,
  input: RejectMaterialIssueInput,
  accessibleWarehouseIds: string[] | null,
) {
  const issue = await findIssueById(issueId);
  if (!issue) {
    throw new AppError("NOT_FOUND", "Material issue not found");
  }
  assertWarehouseAccessible(issue.warehouseId, accessibleWarehouseIds);

  if (issue.status !== "PENDING_APPROVAL") {
    throw new AppError("INVALID_WORKFLOW_STATE", "Issue must be in PENDING_APPROVAL to reject");
  }
  if (issue.requesterId === approverId) {
    throw new AppError("FORBIDDEN_SELF_APPROVAL", "Requester cannot reject their own request");
  }

  return runInTransaction(async (tx) => {
    const approval = await createApproval(
      {
        approver: { connect: { id: approverId } },
        status: "REJECTED",
        approvedAt: new Date(),
        note: input.reason,
      },
      tx,
    );

    const updated = await updateIssue(issueId, { status: "REJECTED", approval: { connect: { id: approval.id } } }, tx);
    return withOverdueFlag(updated);
  });
}

export async function fulfillMaterialIssue(
  issueId: string,
  fulfilledById: string,
  input: FulfillMaterialIssueInput,
  ipAddress: string | undefined,
  accessibleWarehouseIds: string[] | null,
) {
  const issue = await findIssueById(issueId);
  if (!issue) {
    throw new AppError("NOT_FOUND", "Material issue not found");
  }
  assertWarehouseAccessible(issue.warehouseId, accessibleWarehouseIds);

  if (issue.status !== "APPROVED") {
    throw new AppError("INVALID_WORKFLOW_STATE", "Issue must be APPROVED before it can be fulfilled");
  }

  const issuedQtyByMaterialId = new Map(input.items.map((item) => [item.materialId, item.issuedQty]));

  return runInTransaction(async (tx) => {
    let anyIssued = false;
    let anyShortfall = false;

    for (const item of issue.items) {
      const approvedQty = Number(item.approvedQty ?? 0);
      const issuedQty = issuedQtyByMaterialId.get(item.materialId) ?? 0;

      if (issuedQty > approvedQty) {
        throw new AppError(
          "VALIDATION_ERROR",
          `issuedQty for material ${item.materialId} cannot exceed approvedQty (${approvedQty})`,
        );
      }

      if (issuedQty > 0) {
        const balanceResult = await sumQuantityChange(
          { materialId: item.materialId, warehouseId: issue.warehouseId },
          tx,
        );
        const balance = Number(balanceResult._sum.quantityChange ?? 0);
        if (issuedQty > balance) {
          throw new AppError(
            "INSUFFICIENT_STOCK",
            `Only ${balance} of material ${item.materialId} available in stock`,
          );
        }

        anyIssued = true;
        await createTransaction(
          {
            type: "ISSUE",
            quantityChange: -issuedQty,
            unitCost: item.unitCost,
            refDocType: "MATERIAL_ISSUE",
            refDocId: issue.id,
            project: { connect: { id: issue.projectId } },
            material: { connect: { id: item.materialId } },
            warehouse: { connect: { id: issue.warehouseId } },
            performedBy: { connect: { id: fulfilledById } },
            ...(ipAddress ? { ipAddress } : {}),
          },
          tx,
        );
      }

      const isShortfall = issuedQty < approvedQty;
      if (isShortfall) {
        anyShortfall = true;
      }

      await updateIssueItem(
        item.id,
        {
          issuedQty,
          isShortfall,
          ...(isShortfall ? { shortfallNote: `Approved ${approvedQty}, issued ${issuedQty}` } : {}),
        },
        tx,
      );
    }

    if (!anyIssued) {
      throw new AppError("VALIDATION_ERROR", "At least one item must be issued to fulfill this request");
    }

    const updated = await updateIssue(
      issueId,
      {
        status: anyShortfall ? "PARTIALLY_FULFILLED" : "FULFILLED",
        fulfilledBy: { connect: { id: fulfilledById } },
        fulfilledAt: new Date(),
      },
      tx,
    );
    return withOverdueFlag(updated);
  });
}
