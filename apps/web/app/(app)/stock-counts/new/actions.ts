"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../../lib/api";

export async function createStockCountAction(formData: FormData): Promise<void> {
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const materialIds = formData.getAll("materialId").map(String);
  const actualQtys = formData.getAll("actualQty").map(String);
  const reasons = formData.getAll("reason").map(String);

  // The three fields render once per row in the same order, so they zip by index.
  const items = materialIds.map((materialId, index) => {
    const reason = (reasons[index] ?? "").trim();
    return {
      materialId,
      actualQty: actualQtys[index] ?? "0",
      ...(reason ? { reason } : {}),
    };
  });

  if (!warehouseId || items.length === 0) {
    redirect(`/stock-counts/new?error=${encodeURIComponent("ไม่พบรายการวัสดุที่จะนับ")}`);
  }

  const query = new URLSearchParams({ warehouseId });
  try {
    await apiFetch("/stock-counts", {
      method: "POST",
      body: { warehouseId, items },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/stock-counts/new?${query.toString()}&error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/stock-counts");
  redirect("/stock-counts");
}
