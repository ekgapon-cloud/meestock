import { beforeEach, describe, expect, it } from "vitest";
import {
  approveMaterialIssue,
  createMaterialIssue,
  fulfillMaterialIssue,
} from "../services/materialIssueService.js";
import { receiveStock } from "../services/stockLedgerService.js";
import { createEmployee, createMaterial, createProjectWarehouse } from "./factories.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

describe("material issue workflow — state machine and segregation of duties", () => {
  it("refuses to fulfill an issue that hasn't been approved yet (no skipping PENDING_APPROVAL -> FULFILLED)", async () => {
    const requester = await createEmployee({ role: "REQUESTER" });
    const warehouseStaff = await createEmployee({ role: "WAREHOUSE" });
    const { project, warehouse } = await createProjectWarehouse();
    const material = await createMaterial();

    const issue = await createMaterialIssue(
      { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 10 }] },
      requester.id,
      undefined,
      null,
    );

    expect(issue.status).toBe("PENDING_APPROVAL");
    await expect(
      fulfillMaterialIssue(
        issue.id,
        warehouseStaff.id,
        { items: [{ materialId: material.id, issuedQty: 10 }] },
        undefined,
        null,
      ),
    ).rejects.toMatchObject({
      code: "INVALID_WORKFLOW_STATE",
    });
  });

  it("does not let the requester approve their own request", async () => {
    const requester = await createEmployee({ role: "REQUESTER" });
    const { project, warehouse } = await createProjectWarehouse();
    const material = await createMaterial();

    const issue = await createMaterialIssue(
      { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 10 }] },
      requester.id,
      undefined,
      null,
    );

    await expect(approveMaterialIssue(issue.id, requester.id, {}, null)).rejects.toMatchObject({
      code: "FORBIDDEN_SELF_APPROVAL",
    });
  });

  it("approve -> fulfill deducts stock atomically and marks the issue FULFILLED", async () => {
    const requester = await createEmployee({ role: "REQUESTER" });
    const approver = await createEmployee({ role: "APPROVER" });
    const warehouseStaff = await createEmployee({ role: "WAREHOUSE" });
    const { project, warehouse } = await createProjectWarehouse();
    const material = await createMaterial({ standardCost: 10 });

    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 100, unitCost: 10 }, warehouseStaff.id, undefined, null);

    const issue = await createMaterialIssue(
      { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 40 }] },
      requester.id,
      undefined,
      null,
    );
    await approveMaterialIssue(issue.id, approver.id, {}, null);
    const fulfilled = await fulfillMaterialIssue(
      issue.id,
      warehouseStaff.id,
      { items: [{ materialId: material.id, issuedQty: 40 }] },
      undefined,
      null,
    );

    expect(fulfilled.status).toBe("FULFILLED");
    expect(Number(fulfilled.items[0]?.issuedQty)).toBe(40);
    expect(fulfilled.items[0]?.isShortfall).toBe(false);
  });

  it("marks PARTIALLY_FULFILLED with a shortfall note when the warehouse deliberately issues less than approved", async () => {
    const requester = await createEmployee({ role: "REQUESTER" });
    const approver = await createEmployee({ role: "APPROVER" });
    const warehouseStaff = await createEmployee({ role: "WAREHOUSE" });
    const { project, warehouse } = await createProjectWarehouse();
    const material = await createMaterial({ standardCost: 10 });

    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 100, unitCost: 10 }, warehouseStaff.id, undefined, null);

    const issue = await createMaterialIssue(
      { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 50 }] },
      requester.id,
      undefined,
      null,
    );
    await approveMaterialIssue(issue.id, approver.id, {}, null);
    const fulfilled = await fulfillMaterialIssue(
      issue.id,
      warehouseStaff.id,
      { items: [{ materialId: material.id, issuedQty: 20 }] },
      undefined,
      null,
    );

    expect(fulfilled.status).toBe("PARTIALLY_FULFILLED");
    expect(Number(fulfilled.items[0]?.issuedQty)).toBe(20);
    expect(fulfilled.items[0]?.isShortfall).toBe(true);
    expect(fulfilled.items[0]?.shortfallNote).toContain("50");
  });

  it("rejects fulfilling more than what's actually available in stock", async () => {
    const requester = await createEmployee({ role: "REQUESTER" });
    const approver = await createEmployee({ role: "APPROVER" });
    const warehouseStaff = await createEmployee({ role: "WAREHOUSE" });
    const { project, warehouse } = await createProjectWarehouse();
    const material = await createMaterial({ standardCost: 10 });

    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 20, unitCost: 10 }, warehouseStaff.id, undefined, null);

    const issue = await createMaterialIssue(
      { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 50 }] },
      requester.id,
      undefined,
      null,
    );
    await approveMaterialIssue(issue.id, approver.id, {}, null);

    await expect(
      fulfillMaterialIssue(
        issue.id,
        warehouseStaff.id,
        { items: [{ materialId: material.id, issuedQty: 50 }] },
        undefined,
        null,
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  it("rejects fulfilling more than the approved quantity", async () => {
    const requester = await createEmployee({ role: "REQUESTER" });
    const approver = await createEmployee({ role: "APPROVER" });
    const warehouseStaff = await createEmployee({ role: "WAREHOUSE" });
    const { project, warehouse } = await createProjectWarehouse();
    const material = await createMaterial({ standardCost: 10 });

    await receiveStock({ warehouseId: warehouse.id, materialId: material.id, quantity: 100, unitCost: 10 }, warehouseStaff.id, undefined, null);

    const issue = await createMaterialIssue(
      { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 40 }] },
      requester.id,
      undefined,
      null,
    );
    await approveMaterialIssue(issue.id, approver.id, { items: [{ materialId: material.id, approvedQty: 30 }] }, null);

    await expect(
      fulfillMaterialIssue(
        issue.id,
        warehouseStaff.id,
        { items: [{ materialId: material.id, issuedQty: 40 }] },
        undefined,
        null,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
