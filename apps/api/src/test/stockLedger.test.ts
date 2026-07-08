import { beforeEach, describe, expect, it } from "vitest";
import { adjustStock, getStockBalance, receiveStock } from "../services/stockLedgerService.js";
import { AppError } from "../errors/AppError.js";
import { createEmployee, createMaterial, createProjectWarehouse } from "./factories.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("stock ledger — balance calculation and non-negative rule", () => {
  it("sums RECEIVE, ISSUE, and ADJUSTMENT transactions into a single balance", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();

    await receiveStock(
      { warehouseId: warehouse.id, materialId: material.id, quantity: 100, unitCost: 10 },
      employee.id,
      undefined,
      null,
    );
    await adjustStock(
      { warehouseId: warehouse.id, materialId: material.id, quantityChange: -30, unitCost: 10, reason: "damaged" },
      employee.id,
      undefined,
      null,
    );
    await adjustStock(
      { warehouseId: warehouse.id, materialId: material.id, quantityChange: 5, unitCost: 10, reason: "found extra" },
      employee.id,
      undefined,
      null,
    );

    const balance = await getStockBalance({ warehouseId: warehouse.id, materialId: material.id }, null);
    expect(Number(balance[0]?.balance)).toBe(75); // 100 - 30 + 5
  });

  it("rejects an adjustment that would push the balance negative", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();

    await receiveStock(
      { warehouseId: warehouse.id, materialId: material.id, quantity: 10, unitCost: 10 },
      employee.id,
      undefined,
      null,
    );

    await expect(
      adjustStock(
        { warehouseId: warehouse.id, materialId: material.id, quantityChange: -20, unitCost: 10, reason: "count" },
        employee.id,
        undefined,
        null,
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" } satisfies Partial<AppError>);
  });
});
