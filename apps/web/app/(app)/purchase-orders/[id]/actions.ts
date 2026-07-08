"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "../../../../lib/api";

function redirectWithError(id: string, err: unknown): never {
  if (err instanceof ApiError) {
    redirect(`/purchase-orders/${id}?error=${encodeURIComponent(err.message)}`);
  }
  throw err;
}

export async function markPurchaseOrderOrderedAction(id: string): Promise<void> {
  try {
    await apiFetch(`/purchase-orders/${id}/status`, { method: "PATCH", body: { status: "ORDERED" } });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/purchase-orders");
}

export async function cancelPurchaseOrderAction(id: string): Promise<void> {
  try {
    await apiFetch(`/purchase-orders/${id}/status`, { method: "PATCH", body: { status: "CANCELLED" } });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/purchase-orders");
}
