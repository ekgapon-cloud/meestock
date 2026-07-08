import type { AccessLevel } from "@prisma/client";

/** STAFF does not see product cost (see `AccessLevel` enum comment in schema.prisma, skills/security.md). */
export function canViewCost(accessLevel: AccessLevel): boolean {
  return accessLevel === "MANAGER" || accessLevel === "ADMIN";
}

/**
 * Strips unitCost/standardCost from a stock-transaction- or material-issue-item-shaped object.
 * Reshapes heterogeneous Prisma payloads for a JSON response, so this intentionally works on
 * loosely-typed records rather than preserving the exact input type.
 */
export function redactCost<T extends Record<string, unknown>>(entity: T): T {
  const { material, ...rest } = entity as Record<string, unknown> & { material?: Record<string, unknown> };
  return {
    ...rest,
    unitCost: null,
    ...(material ? { material: { ...material, standardCost: null } } : {}),
  } as unknown as T;
}

export function redactIssueCost<T extends Record<string, unknown> & { items: Record<string, unknown>[] }>(
  issue: T,
): T {
  return {
    ...issue,
    items: issue.items.map((item) => redactCost(item)),
  } as T;
}
