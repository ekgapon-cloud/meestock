"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "../../../../lib/api";

function redirectWithError(id: string, err: unknown): never {
  if (err instanceof ApiError) {
    redirect(`/material-issues/${id}?error=${encodeURIComponent(err.message)}`);
  }
  throw err;
}

function parseQtyItems(formData: FormData, prefix: string): { materialId: string; qty: number }[] {
  const items: { materialId: string; qty: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(prefix)) continue;
    items.push({ materialId: key.slice(prefix.length), qty: Number(value) });
  }
  return items;
}

export async function approveMaterialIssueAction(id: string, formData: FormData): Promise<void> {
  const items = parseQtyItems(formData, "approvedQty__").map(({ materialId, qty }) => ({
    materialId,
    approvedQty: qty,
  }));
  try {
    await apiFetch(`/material-issues/${id}/approve`, { method: "POST", body: { items } });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/material-issues/${id}`);
  revalidatePath("/material-issues");
}

export async function rejectMaterialIssueAction(id: string, formData: FormData): Promise<void> {
  const reason = String(formData.get("reason") ?? "");
  try {
    await apiFetch(`/material-issues/${id}/reject`, { method: "POST", body: { reason } });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/material-issues/${id}`);
  revalidatePath("/material-issues");
}

export async function fulfillMaterialIssueAction(id: string, formData: FormData): Promise<void> {
  const items = parseQtyItems(formData, "issuedQty__").map(({ materialId, qty }) => ({
    materialId,
    issuedQty: qty,
  }));
  try {
    await apiFetch(`/material-issues/${id}/fulfill`, { method: "POST", body: { items } });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/material-issues/${id}`);
  revalidatePath("/material-issues");
}
