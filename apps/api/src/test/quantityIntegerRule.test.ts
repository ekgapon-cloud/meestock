import { describe, expect, it } from "vitest";
import { createGoodsReceiveSchema } from "../validation/goodsReceiveSchema.js";
import { createMaterialIssueSchema } from "../validation/materialIssueSchema.js";
import { createPurchaseOrderSchema } from "../validation/purchaseOrderSchema.js";
import { adjustStockSchema, receiveStockSchema } from "../validation/stockSchema.js";
import { createStockCountSchema } from "../validation/stockCountSchema.js";
import { createStockTransferSchema } from "../validation/stockTransferSchema.js";

/**
 * Material quantities must be whole numbers everywhere (purchase, issue, transfer, count, receive,
 * adjust). Money fields (unitCost/standardCost) may still be fractional. These schema-level checks
 * lock the rule since the integration tests call services directly and bypass zod.
 */
describe("quantity fields reject fractional input; money fields allow it", () => {
  it("purchase order orderedQty must be an integer (unitCost may be fractional)", () => {
    const base = { supplierId: "s1", items: [{ materialId: "m1", orderedQty: 2.5, unitCost: 10.75 }] };
    expect(createPurchaseOrderSchema.safeParse(base).success).toBe(false);
    expect(
      createPurchaseOrderSchema.safeParse({ ...base, items: [{ materialId: "m1", orderedQty: 3, unitCost: 10.75 }] }).success,
    ).toBe(true);
  });

  it("material issue requestedQty must be an integer", () => {
    const good = { projectId: "p1", warehouseId: "w1", items: [{ materialId: "m1", requestedQty: 3 }] };
    expect(createMaterialIssueSchema.safeParse(good).success).toBe(true);
    expect(
      createMaterialIssueSchema.safeParse({ ...good, items: [{ materialId: "m1", requestedQty: 3.2 }] }).success,
    ).toBe(false);
  });

  it("stock transfer quantity must be an integer", () => {
    const good = { fromWarehouseId: "a", toWarehouseId: "b", items: [{ materialId: "m1", quantity: 5 }] };
    expect(createStockTransferSchema.safeParse(good).success).toBe(true);
    expect(
      createStockTransferSchema.safeParse({ ...good, items: [{ materialId: "m1", quantity: 5.5 }] }).success,
    ).toBe(false);
  });

  it("stock count actualQty must be an integer", () => {
    const good = { warehouseId: "w1", items: [{ materialId: "m1", actualQty: 0 }] };
    expect(createStockCountSchema.safeParse(good).success).toBe(true);
    expect(
      createStockCountSchema.safeParse({ ...good, items: [{ materialId: "m1", actualQty: 1.5 }] }).success,
    ).toBe(false);
  });

  it("goods receive quantity must be an integer (unitCost may be fractional)", () => {
    const good = { warehouseId: "w1", supplierId: "s1", items: [{ materialId: "m1", quantity: 4, unitCost: 12.5 }] };
    expect(createGoodsReceiveSchema.safeParse(good).success).toBe(true);
    expect(
      createGoodsReceiveSchema.safeParse({ ...good, items: [{ materialId: "m1", quantity: 4.2, unitCost: 12.5 }] }).success,
    ).toBe(false);
  });

  it("stock receive/adjust quantities must be integers (unitCost may be fractional)", () => {
    expect(receiveStockSchema.safeParse({ warehouseId: "w", materialId: "m", quantity: 10, unitCost: 9.99 }).success).toBe(true);
    expect(receiveStockSchema.safeParse({ warehouseId: "w", materialId: "m", quantity: 10.5, unitCost: 9.99 }).success).toBe(false);
    expect(adjustStockSchema.safeParse({ warehouseId: "w", materialId: "m", quantityChange: -3, unitCost: 5, reason: "x" }).success).toBe(true);
    expect(adjustStockSchema.safeParse({ warehouseId: "w", materialId: "m", quantityChange: -3.3, unitCost: 5, reason: "x" }).success).toBe(false);
  });
});
