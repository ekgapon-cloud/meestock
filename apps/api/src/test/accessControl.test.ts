import { beforeEach, describe, expect, it } from "vitest";
import { assertWarehouseAccessible, getAccessibleWarehouseIds } from "../services/accessControlService.js";
import { getStockBalance, receiveStock } from "../services/stockLedgerService.js";
import { createEmployee, createMaterial, createProjectWarehouse, grantSiteAccess } from "./factories.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("two-dimensional access control — site visibility", () => {
  it("gives ADMIN unrestricted access (null = no filter)", async () => {
    const admin = await createEmployee({ role: "WAREHOUSE", accessLevel: "ADMIN" });
    const ids = await getAccessibleWarehouseIds(admin.id, "ADMIN");
    expect(ids).toBeNull();
  });

  it("restricts a STAFF employee to only their granted warehouses", async () => {
    const staff = await createEmployee({ role: "WAREHOUSE", accessLevel: "STAFF" });
    const { warehouse: warehouseA } = await createProjectWarehouse();
    const { warehouse: warehouseB } = await createProjectWarehouse();
    await grantSiteAccess(staff.id, warehouseA.id);

    const ids = await getAccessibleWarehouseIds(staff.id, "STAFF");
    expect(ids).toEqual([warehouseA.id]);
    expect(ids).not.toContain(warehouseB.id);
  });

  it("throws FORBIDDEN_SITE when asserting access to a warehouse outside the allowed list", () => {
    expect(() => assertWarehouseAccessible("some-other-warehouse", ["warehouse-a"])).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN_SITE" }),
    );
  });

  it("filters stock balance results down to only the caller's accessible warehouses", async () => {
    const staff = await createEmployee({ role: "WAREHOUSE", accessLevel: "STAFF" });
    const warehouseKeeper = await createEmployee({ role: "WAREHOUSE" });
    const { warehouse: warehouseA } = await createProjectWarehouse();
    const { warehouse: warehouseB } = await createProjectWarehouse();
    const material = await createMaterial();
    await grantSiteAccess(staff.id, warehouseA.id);

    await receiveStock({ warehouseId: warehouseA.id, materialId: material.id, quantity: 50, unitCost: 10 }, warehouseKeeper.id, undefined, null);
    await receiveStock({ warehouseId: warehouseB.id, materialId: material.id, quantity: 999, unitCost: 10 }, warehouseKeeper.id, undefined, null);

    const accessibleWarehouseIds = await getAccessibleWarehouseIds(staff.id, "STAFF");
    const balance = await getStockBalance({ materialId: material.id }, accessibleWarehouseIds);

    expect(balance).toHaveLength(1);
    expect(balance[0]?.warehouseId).toBe(warehouseA.id);
  });
});
