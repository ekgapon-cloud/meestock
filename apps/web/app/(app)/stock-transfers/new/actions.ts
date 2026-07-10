"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../../lib/api";

export async function createStockTransferAction(formData: FormData): Promise<void> {
  const fromWarehouseId = String(formData.get("fromWarehouseId") ?? "");
  const toWarehouseId = String(formData.get("toWarehouseId") ?? "");
  const materialIds = formData.getAll("materialId").map(String);
  const qtys = formData.getAll("qty").map(String);

  const items = materialIds
    .map((materialId, index) => ({ materialId, quantity: qtys[index] ?? "0" }))
    .filter((item) => item.materialId && Number(item.quantity) > 0);

  if (!fromWarehouseId || !toWarehouseId || items.length === 0) {
    redirect(`/stock-transfers/new?error=${encodeURIComponent("กรุณาเลือกคลังต้นทาง ปลายทาง และวัสดุอย่างน้อย 1 รายการ")}`);
  }
  if (fromWarehouseId === toWarehouseId) {
    redirect(`/stock-transfers/new?error=${encodeURIComponent("คลังต้นทางและปลายทางต้องไม่ใช่คลังเดียวกัน")}`);
  }

  try {
    await apiFetch("/stock-transfers", {
      method: "POST",
      body: { fromWarehouseId, toWarehouseId, items },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/stock-transfers/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/stock-transfers");
  redirect("/stock-transfers");
}
