import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../errors/AppError.js";
import { createMaterialIssue } from "../services/materialIssueService.js";
import {
  assertProjectAcceptsIssues,
  createProjectWithWarehouse,
  getProject,
  updateProjectStatus,
} from "../services/projectService.js";
import { createEmployee, createMaterial, createProjectWarehouse } from "./factories.js";
import { resetDatabase } from "./dbHelpers.js";

beforeEach(async () => {
  await resetDatabase();
});

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    code: "PRJ-TEST-001",
    name: "โครงการทดสอบ",
    newCustomerName: "ลูกค้าใหม่",
    startDate: new Date("2026-01-01"),
    contractValue: 1_000_000,
    ...overrides,
  } as Parameters<typeof createProjectWithWarehouse>[0];
}

describe("project management", () => {
  it("creates a project, its inline customer, and a SITE warehouse atomically", async () => {
    const project = await createProjectWithWarehouse(baseInput({ warehouseName: "คลังไซต์ A" }));

    expect(project.code).toBe("PRJ-TEST-001");
    expect(project.status).toBe("PLANNING");
    expect(project.customer.name).toBe("ลูกค้าใหม่");
    expect(project.warehouses).toHaveLength(1);
    expect(project.warehouses[0]?.type).toBe("SITE");
    expect(project.warehouses[0]?.name).toBe("คลังไซต์ A");
    expect(project.warehouses[0]?.projectId).toBe(project.id);
  });

  it("defaults the site warehouse name to the project name", async () => {
    const project = await createProjectWithWarehouse(baseInput({ name: "อาคารสำนักงาน" }));
    expect(project.warehouses[0]?.name).toBe("อาคารสำนักงาน");
  });

  it("rejects a duplicate project code", async () => {
    await createProjectWithWarehouse(baseInput());
    await expect(createProjectWithWarehouse(baseInput({ name: "ซ้ำรหัส" }))).rejects.toMatchObject({
      code: "CONFLICT",
    } satisfies Partial<AppError>);
  });

  it("follows the status state machine and stamps endDate on completion", async () => {
    const project = await createProjectWithWarehouse(baseInput());

    const started = await updateProjectStatus(project.id, { status: "IN_PROGRESS" });
    expect(started.status).toBe("IN_PROGRESS");

    const completed = await updateProjectStatus(project.id, { status: "COMPLETED" });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.endDate).not.toBeNull();
  });

  it("rejects an illegal status transition", async () => {
    const project = await createProjectWithWarehouse(baseInput());
    // PLANNING -> COMPLETED skips IN_PROGRESS
    await expect(updateProjectStatus(project.id, { status: "COMPLETED" })).rejects.toMatchObject({
      code: "INVALID_WORKFLOW_STATE",
    } satisfies Partial<AppError>);
  });

  it("cannot transition out of a terminal status", async () => {
    const project = await createProjectWithWarehouse(baseInput());
    await updateProjectStatus(project.id, { status: "CANCELLED" });
    await expect(updateProjectStatus(project.id, { status: "IN_PROGRESS" })).rejects.toMatchObject({
      code: "INVALID_WORKFLOW_STATE",
    } satisfies Partial<AppError>);
  });

  describe("issue enforcement", () => {
    it("allows a material issue to an open project", async () => {
      const { project, warehouse } = await createProjectWarehouse(); // status PLANNING
      const requester = await createEmployee({ role: "REQUESTER" });
      const material = await createMaterial();

      const issue = await createMaterialIssue(
        { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 3 }] },
        requester.id,
        undefined,
        null,
      );
      expect(issue.status).toBe("PENDING_APPROVAL");
    });

    it("blocks a material issue to a closed (cancelled/completed) project", async () => {
      const { project, warehouse } = await createProjectWarehouse();
      await updateProjectStatus(project.id, { status: "CANCELLED" });
      const requester = await createEmployee({ role: "REQUESTER" });
      const material = await createMaterial();

      await expect(
        createMaterialIssue(
          { projectId: project.id, warehouseId: warehouse.id, items: [{ materialId: material.id, requestedQty: 3 }] },
          requester.id,
          undefined,
          null,
        ),
      ).rejects.toMatchObject({ code: "INVALID_WORKFLOW_STATE" } satisfies Partial<AppError>);
    });

    it("assertProjectAcceptsIssues throws only for closed projects", async () => {
      const { project } = await createProjectWarehouse();
      await expect(assertProjectAcceptsIssues(project.id)).resolves.toBeUndefined();
      await updateProjectStatus(project.id, { status: "IN_PROGRESS" });
      await updateProjectStatus(project.id, { status: "COMPLETED" });
      await expect(assertProjectAcceptsIssues(project.id)).rejects.toMatchObject({
        code: "INVALID_WORKFLOW_STATE",
      } satisfies Partial<AppError>);
      // getProject still works on a closed project
      expect((await getProject(project.id)).status).toBe("COMPLETED");
    });
  });
});
