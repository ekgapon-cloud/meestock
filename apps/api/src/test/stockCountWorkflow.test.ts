import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";
import { createStockCountWithValidation, getStockCount, listStockCounts } from "../services/stockCountService.js";
import { getStockBalance, receiveStock } from "../services/stockLedgerService.js";
import { createEmployee, createMaterial, createProjectWarehouse, grantSiteAccess } from "./factories.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

async function balance(warehouseId: string, materialId: string): Promise<number> {
  const rows = await getStockBalance({ warehouseId, materialId }, null);
  return Number(rows[0]?.balance ?? 0);
}

describe("stock count — physical count and adjustment", () => {
  it("posts an ADJUSTMENT for a positive discrepancy and moves the balance to the counted qty", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 100, unitCost: 10 }, employee.id, undefined, null);

    const count = await createStockCountWithValidation(
      { warehouseId: warehouse.id, items: [{ materialId: material.id, actualQty: 105, reason: "นับสต๊อกประจำเดือน" }] },
      employee.id,
      undefined,
      null,
    );

    expect(count.docNo).toMatch(/^SC-\d{8}-\d{4}$/);
    expect(count.items[0]?.systemQty.toString()).toBe("100");
    expect(count.items[0]?.actualQty.toString()).toBe("105");
    expect(await balance(warehouse.id, material.id)).toBe(105);

    const adj = await prisma.stockTransaction.findFirst({
      where: { refDocType: "STOCK_COUNT", refDocId: count.id, type: "ADJUSTMENT" },
    });
    expect(Number(adj?.quantityChange)).toBe(5);
    expect(adj?.warehouseId).toBe(warehouse.id);
    expect(adj?.note).toBe("นับสต๊อกประจำเดือน");
  });

  it("posts a negative ADJUSTMENT when the count is short", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 50, unitCost: 10 }, employee.id, undefined, null);

    const count = await createStockCountWithValidation(
      { warehouseId: warehouse.id, items: [{ materialId: material.id, actualQty: 42, reason: "วัสดุชำรุด" }] },
      employee.id,
      undefined,
      null,
    );

    expect(await balance(warehouse.id, material.id)).toBe(42);
    const adj = await prisma.stockTransaction.findFirst({
      where: { refDocType: "STOCK_COUNT", refDocId: count.id, type: "ADJUSTMENT" },
    });
    expect(Number(adj?.quantityChange)).toBe(-8);
  });

  it("records the item but posts no ledger row when the count matches the system", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 30, unitCost: 10 }, employee.id, undefined, null);

    const count = await createStockCountWithValidation(
      { warehouseId: warehouse.id, items: [{ materialId: material.id, actualQty: 30 }] },
      employee.id,
      undefined,
      null,
    );

    expect(count.items).toHaveLength(1);
    expect(await balance(warehouse.id, material.id)).toBe(30);
    const adjCount = await prisma.stockTransaction.count({
      where: { refDocType: "STOCK_COUNT", refDocId: count.id },
    });
    expect(adjCount).toBe(0);
  });

  it("values the adjustment at the material's weighted-average cost, not a revaluation", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();
    // 100 @ 10 + 100 @ 20 => weighted-average cost 15
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 100, unitCost: 10 }, employee.id, undefined, null);
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 100, unitCost: 20 }, employee.id, undefined, null);

    const count = await createStockCountWithValidation(
      { warehouseId: warehouse.id, items: [{ materialId: material.id, actualQty: 190, reason: "หาย 10 หน่วย" }] },
      employee.id,
      undefined,
      null,
    );

    const adj = await prisma.stockTransaction.findFirst({
      where: { refDocType: "STOCK_COUNT", refDocId: count.id, type: "ADJUSTMENT" },
    });
    expect(Number(adj?.quantityChange)).toBe(-10);
    expect(Number(adj?.unitCost)).toBe(15);
  });

  it("rejects a discrepancy with no reason", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 20, unitCost: 10 }, employee.id, undefined, null);

    await expect(
      createStockCountWithValidation(
        { warehouseId: warehouse.id, items: [{ materialId: material.id, actualQty: 18 }] },
        employee.id,
        undefined,
        null,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<AppError>);

    // nothing should have moved
    expect(await balance(warehouse.id, material.id)).toBe(20);
  });

  it("forbids counting a warehouse the editor cannot access", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const { warehouse: other } = await createProjectWarehouse();
    const material = await createMaterial();
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 10, unitCost: 10 }, employee.id, undefined, null);

    await expect(
      createStockCountWithValidation(
        { warehouseId: warehouse.id, items: [{ materialId: material.id, actualQty: 9, reason: "x" }] },
        employee.id,
        undefined,
        [other.id],
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN_SITE" } satisfies Partial<AppError>);
  });

  it("lists and fetches a count, scoped to accessible warehouses", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();
    await grantSiteAccess(employee.id, warehouse.id);
    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 12, unitCost: 10 }, employee.id, undefined, null);

    const count = await createStockCountWithValidation(
      { warehouseId: warehouse.id, items: [{ materialId: material.id, actualQty: 11, reason: "แตกหัก" }] },
      employee.id,
      undefined,
      [warehouse.id],
    );

    const list = await listStockCounts({ page: 1, limit: 20 }, [warehouse.id]);
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(count.id);

    const fetched = await getStockCount(count.id, [warehouse.id]);
    expect(fetched.items).toHaveLength(1);

    const { warehouse: other } = await createProjectWarehouse();
    await expect(getStockCount(count.id, [other.id])).rejects.toMatchObject({
      code: "FORBIDDEN_SITE",
    } satisfies Partial<AppError>);
  });
});
