import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/prisma.js";
import { createStockTransferWithValidation, getStockTransfer, listStockTransfers } from "../services/stockTransferService.js";
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

describe("stock transfer — moving inventory between warehouses", () => {
  it("moves stock: source balance drops, destination rises, via TRANSFER_OUT/TRANSFER_IN ledger rows", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse: from } = await createProjectWarehouse();
    const { warehouse: to } = await createProjectWarehouse();
    const material = await createMaterial();

    await receiveStock(
      { warehouseId: from.id, materialId: material.id, quantity: 100, unitCost: 10 },
      employee.id,
      undefined,
      null,
    );

    const transfer = await createStockTransferWithValidation(
      { fromWarehouseId: from.id, toWarehouseId: to.id, items: [{ materialId: material.id, quantity: 30 }] },
      employee.id,
      undefined,
      null,
    );

    expect(transfer.docNo).toMatch(/^TR-\d{8}-\d{4}$/);
    expect(await balance(from.id, material.id)).toBe(70);
    expect(await balance(to.id, material.id)).toBe(30);

    const txns = await prisma.stockTransaction.findMany({
      where: { refDocType: "STOCK_TRANSFER", refDocId: transfer.id },
    });
    const out = txns.find((t) => t.type === "TRANSFER_OUT");
    const inb = txns.find((t) => t.type === "TRANSFER_IN");
    expect(Number(out?.quantityChange)).toBe(-30);
    expect(out?.warehouseId).toBe(from.id);
    expect(Number(inb?.quantityChange)).toBe(30);
    expect(inb?.warehouseId).toBe(to.id);
  });

  it("carries the source warehouse's weighted-average cost onto both ledger rows (no revaluation)", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse: from } = await createProjectWarehouse();
    const { warehouse: to } = await createProjectWarehouse();
    const material = await createMaterial();

    // 100 @ 10 + 100 @ 20 => weighted-average cost 15
    await receiveStock({ warehouseId: from.id, materialId: material.id, quantity: 100, unitCost: 10 }, employee.id, undefined, null);
    await receiveStock({ warehouseId: from.id, materialId: material.id, quantity: 100, unitCost: 20 }, employee.id, undefined, null);

    const transfer = await createStockTransferWithValidation(
      { fromWarehouseId: from.id, toWarehouseId: to.id, items: [{ materialId: material.id, quantity: 50 }] },
      employee.id,
      undefined,
      null,
    );

    const txns = await prisma.stockTransaction.findMany({
      where: { refDocType: "STOCK_TRANSFER", refDocId: transfer.id },
    });
    for (const t of txns) {
      expect(Number(t.unitCost)).toBe(15);
    }
  });

  it("exposes each item's carried unit cost on the fetched transfer detail", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse: from } = await createProjectWarehouse();
    const { warehouse: to } = await createProjectWarehouse();
    const material = await createMaterial();

    // 100 @ 10 + 100 @ 20 => weighted-average cost 15
    await receiveStock({ warehouseId: from.id, materialId: material.id, quantity: 100, unitCost: 10 }, employee.id, undefined, null);
    await receiveStock({ warehouseId: from.id, materialId: material.id, quantity: 100, unitCost: 20 }, employee.id, undefined, null);

    const created = await createStockTransferWithValidation(
      { fromWarehouseId: from.id, toWarehouseId: to.id, items: [{ materialId: material.id, quantity: 50 }] },
      employee.id,
      undefined,
      null,
    );

    const fetched = await getStockTransfer(created.id, null);
    expect(fetched.items).toHaveLength(1);
    expect(Number(fetched.items[0]?.unitCost)).toBe(15);
  });

  it("rejects a transfer that exceeds the source balance", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse: from } = await createProjectWarehouse();
    const { warehouse: to } = await createProjectWarehouse();
    const material = await createMaterial();

    await receiveStock({ warehouseId: from.id, materialId: material.id, quantity: 10, unitCost: 10 }, employee.id, undefined, null);

    await expect(
      createStockTransferWithValidation(
        { fromWarehouseId: from.id, toWarehouseId: to.id, items: [{ materialId: material.id, quantity: 20 }] },
        employee.id,
        undefined,
        null,
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" } satisfies Partial<AppError>);

    // nothing should have moved
    expect(await balance(from.id, material.id)).toBe(10);
    expect(await balance(to.id, material.id)).toBe(0);
  });

  it("rejects a transfer where source and destination are the same warehouse", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse } = await createProjectWarehouse();
    const material = await createMaterial();

    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 10, unitCost: 10 }, employee.id, undefined, null);

    await expect(
      createStockTransferWithValidation(
        { fromWarehouseId: warehouse.id, toWarehouseId: warehouse.id, items: [{ materialId: material.id, quantity: 5 }] },
        employee.id,
        undefined,
        null,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<AppError>);
  });

  it("forbids transferring across a warehouse the mover cannot access", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse: from } = await createProjectWarehouse();
    const { warehouse: to } = await createProjectWarehouse();
    const material = await createMaterial();
    // access to source only
    const accessible = [from.id];

    await receiveStock({ warehouseId: from.id, materialId: material.id, quantity: 10, unitCost: 10 }, employee.id, undefined, null);

    await expect(
      createStockTransferWithValidation(
        { fromWarehouseId: from.id, toWarehouseId: to.id, items: [{ materialId: material.id, quantity: 5 }] },
        employee.id,
        undefined,
        accessible,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN_SITE" } satisfies Partial<AppError>);
  });

  it("lists and fetches a transfer, scoped to accessible warehouses", async () => {
    const employee = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse: from } = await createProjectWarehouse();
    const { warehouse: to } = await createProjectWarehouse();
    const material = await createMaterial();
    await grantSiteAccess(employee.id, from.id);
    await grantSiteAccess(employee.id, to.id);

    await receiveStock({ warehouseId: from.id, materialId: material.id, quantity: 40, unitCost: 10 }, employee.id, undefined, null);
    const transfer = await createStockTransferWithValidation(
      { fromWarehouseId: from.id, toWarehouseId: to.id, items: [{ materialId: material.id, quantity: 15 }] },
      employee.id,
      undefined,
      [from.id, to.id],
    );

    const list = await listStockTransfers({ page: 1, limit: 20 }, [from.id, to.id]);
    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(transfer.id);

    const fetched = await getStockTransfer(transfer.id, [from.id, to.id]);
    expect(fetched.items).toHaveLength(1);
    expect(fetched.fromWarehouse.id).toBe(from.id);
    expect(fetched.toWarehouse.id).toBe(to.id);

    // a viewer with access to neither endpoint is refused
    const { warehouse: other } = await createProjectWarehouse();
    await expect(getStockTransfer(transfer.id, [other.id])).rejects.toMatchObject({
      code: "FORBIDDEN_SITE",
    } satisfies Partial<AppError>);
  });
});
