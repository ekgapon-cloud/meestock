import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { employeeRefSelect } from "./employeeRepository.js";

type Client = Prisma.TransactionClient | typeof prisma;

const issueInclude = {
  requester: { select: employeeRefSelect },
  fulfilledBy: { select: employeeRefSelect },
  warehouse: true,
  project: true,
  approval: { include: { approver: { select: employeeRefSelect } } },
  items: { include: { material: true } },
} satisfies Prisma.MaterialIssueInclude;

export function findIssues(where: Prisma.MaterialIssueWhereInput, skip: number, take: number) {
  return prisma.materialIssue.findMany({
    where,
    skip,
    take,
    include: issueInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function countIssues(where: Prisma.MaterialIssueWhereInput) {
  return prisma.materialIssue.count({ where });
}

export function groupIssuesByStatus(where: Prisma.MaterialIssueWhereInput) {
  return prisma.materialIssue.groupBy({ by: ["status"], where, _count: { _all: true } });
}

export function findIssueItemsForSummary(where: Prisma.MaterialIssueWhereInput) {
  return prisma.materialIssueItem.findMany({
    where: { materialIssue: where },
    select: { issuedQty: true, unitCost: true },
  });
}

export function findIssueById(id: string, client: Client = prisma) {
  return client.materialIssue.findUnique({ where: { id }, include: issueInclude });
}

export async function findLatestDocNoWithPrefix(prefix: string, client: Client = prisma) {
  const latest = await client.materialIssue.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: "desc" },
    select: { docNo: true },
  });
  return latest?.docNo ?? null;
}

export function createIssue(data: Prisma.MaterialIssueCreateInput) {
  return prisma.materialIssue.create({ data, include: issueInclude });
}

export function createApproval(data: Prisma.ApprovalCreateInput, client: Client) {
  return client.approval.create({ data });
}

export function updateIssue(id: string, data: Prisma.MaterialIssueUpdateInput, client: Client = prisma) {
  return client.materialIssue.update({ where: { id }, data, include: issueInclude });
}

export function updateIssueItem(id: string, data: Prisma.MaterialIssueItemUpdateInput, client: Client) {
  return client.materialIssueItem.update({ where: { id }, data });
}

export function runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}
