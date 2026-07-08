import { Prisma } from "@prisma/client";

/**
 * docNo generation across MaterialIssue/PurchaseOrder/GoodsReceive is a non-atomic
 * "count today's rows, use count+1" scheme — two overlapping creates can read the same
 * count and collide on the docNo unique constraint (P2002). Retries with a freshly
 * regenerated docNo instead of surfacing a 500 for what is really a transient collision.
 */
export async function createWithDocNoRetry<T>(attempt: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await attempt();
    } catch (err) {
      const isDocNoConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isDocNoConflict || i === maxAttempts - 1) {
        throw err;
      }
    }
  }
  throw new Error("unreachable");
}
