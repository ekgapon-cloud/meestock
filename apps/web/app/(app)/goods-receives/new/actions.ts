"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../../lib/api";

function buildBackUrl(warehouseId: string, purchaseOrderId: string | undefined, error?: string): string {
  const params = new URLSearchParams();
  if (warehouseId) params.set("warehouseId", warehouseId);
  if (purchaseOrderId) params.set("poId", purchaseOrderId);
  if (error) params.set("error", error);
  const qs = params.toString();
  return `/goods-receives/new${qs ? `?${qs}` : ""}`;
}

export async function createGoodsReceiveAction(formData: FormData): Promise<void> {
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const purchaseOrderIdRaw = formData.get("purchaseOrderId");
  const purchaseOrderId = purchaseOrderIdRaw ? String(purchaseOrderIdRaw) : undefined;
  const supplierIdRaw = formData.get("supplierId");
  const supplierId = supplierIdRaw ? String(supplierIdRaw) : undefined;
  const materialIds = formData.getAll("materialId").map(String);
  const qtys = formData.getAll("qty").map(String);
  const unitCosts = formData.getAll("unitCost").map(String);

  const items = materialIds
    .map((materialId, index) => ({
      materialId,
      quantity: qtys[index] ?? "0",
      unitCost: unitCosts[index] ?? "0",
    }))
    .filter((item) => item.materialId && Number(item.quantity) > 0);

  if (!warehouseId || items.length === 0) {
    redirect(buildBackUrl(warehouseId, purchaseOrderId, "กรุณาเลือกไซต์งานและวัสดุอย่างน้อย 1 รายการ"));
  }
  if (!purchaseOrderId && !supplierId) {
    redirect(buildBackUrl(warehouseId, purchaseOrderId, "ต้องระบุผู้ขายเมื่อไม่มีใบสั่งซื้ออ้างอิง"));
  }

  try {
    await apiFetch("/goods-receives", {
      method: "POST",
      body: {
        warehouseId,
        ...(purchaseOrderId ? { purchaseOrderId } : {}),
        ...(supplierId ? { supplierId } : {}),
        items,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(buildBackUrl(warehouseId, purchaseOrderId, err.message));
    }
    throw err;
  }

  revalidatePath("/goods-receives");
  revalidatePath("/purchase-orders");
  if (purchaseOrderId) {
    revalidatePath(`/purchase-orders/${purchaseOrderId}`);
  }
  redirect("/goods-receives");
}
