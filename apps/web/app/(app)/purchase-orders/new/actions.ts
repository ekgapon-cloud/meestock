"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../../lib/api";

export async function createPurchaseOrderAction(formData: FormData): Promise<void> {
  const supplierId = String(formData.get("supplierId") ?? "");
  const materialIds = formData.getAll("materialId").map(String);
  const qtys = formData.getAll("qty").map(String);
  const unitCosts = formData.getAll("unitCost").map(String);

  const items = materialIds
    .map((materialId, index) => ({
      materialId,
      orderedQty: qtys[index] ?? "0",
      unitCost: unitCosts[index] ?? "0",
    }))
    .filter((item) => item.materialId && Number(item.orderedQty) > 0);

  if (!supplierId || items.length === 0) {
    redirect(`/purchase-orders/new?error=${encodeURIComponent("กรุณาเลือกผู้ขายและวัสดุอย่างน้อย 1 รายการ")}`);
  }

  try {
    await apiFetch("/purchase-orders", { method: "POST", body: { supplierId, items } });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/purchase-orders/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}
