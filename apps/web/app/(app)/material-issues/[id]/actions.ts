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

export async function approveMaterialIssueAction(id: string): Promise<void> {
  try {
    await apiFetch(`/material-issues/${id}/approve`, { method: "POST", body: {} });
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

export async function fulfillMaterialIssueAction(id: string): Promise<void> {
  try {
    await apiFetch(`/material-issues/${id}/fulfill`, { method: "POST" });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/material-issues/${id}`);
  revalidatePath("/material-issues");
}
