"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Warehouse } from "shared-types";
import { apiFetch, ApiError } from "../../../../lib/api";

export async function createMaterialIssueAction(formData: FormData): Promise<void> {
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const materialIds = formData.getAll("materialId").map(String);
  const qtys = formData.getAll("qty").map(String);

  const items = materialIds
    .map((materialId, index) => ({ materialId, requestedQty: qtys[index] ?? "0" }))
    .filter((item) => item.materialId && Number(item.requestedQty) > 0);

  if (!warehouseId || items.length === 0) {
    redirect(`/material-issues/new?error=${encodeURIComponent("กรุณาเลือกไซต์งานและวัสดุอย่างน้อย 1 รายการ")}`);
  }

  let projectId: string;
  try {
    const warehouses = await apiFetch<Warehouse[]>("/warehouses");
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (!warehouse?.projectId) {
      redirect(`/material-issues/new?error=${encodeURIComponent("ไซต์งานนี้ไม่ได้ผูกกับโครงการ")}`);
    }
    projectId = warehouse.projectId;
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/material-issues/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  try {
    await apiFetch("/material-issues", {
      method: "POST",
      body: { projectId, warehouseId, items },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/material-issues/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/material-issues");
  redirect("/material-issues");
}
