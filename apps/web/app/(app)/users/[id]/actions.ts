"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "../../../../lib/api";

function redirectWithError(id: string, err: unknown): never {
  if (err instanceof ApiError) {
    redirect(`/users/${id}?error=${encodeURIComponent(err.message)}`);
  }
  throw err;
}

export async function updateUserAction(id: string, formData: FormData): Promise<void> {
  const name = formData.get("name");
  const email = formData.get("email");
  const role = formData.get("role");
  const accessLevel = formData.get("accessLevel");

  const body: Record<string, unknown> = {};
  if (name) body["name"] = String(name);
  if (email) body["email"] = String(email);
  if (role) body["role"] = String(role);
  if (accessLevel) body["accessLevel"] = String(accessLevel);

  // A disabled <select>/unchecked <input type="checkbox"> are both simply absent from FormData, so
  // "isActive" alone can't tell "admin unchecked it" apart from "field disabled for self-edit" — the
  // isActivePresent marker (rendered only when the checkbox itself is rendered, i.e. not self) disambiguates.
  if (formData.get("isActivePresent")) {
    body["isActive"] = formData.get("isActive") === "on";
  }

  try {
    await apiFetch(`/users/${id}`, { method: "PATCH", body });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/users/${id}`);
  revalidatePath("/users");
}

export async function assignSiteAccessAction(id: string, formData: FormData): Promise<void> {
  const warehouseId = String(formData.get("warehouseId") ?? "");
  if (!warehouseId) {
    redirect(`/users/${id}?error=${encodeURIComponent("กรุณาเลือกไซต์งาน")}`);
  }

  try {
    await apiFetch(`/users/${id}/site-access`, { method: "POST", body: { warehouseId } });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/users/${id}`);
}

export async function resetUserPasswordAction(id: string, formData: FormData): Promise<void> {
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) {
    redirect(`/users/${id}?error=${encodeURIComponent("รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร")}`);
  }

  try {
    await apiFetch(`/users/${id}/password`, { method: "PATCH", body: { newPassword } });
  } catch (err) {
    redirectWithError(id, err);
  }
  redirect(`/users/${id}?passwordReset=1`);
}

export async function revokeSiteAccessAction(id: string, warehouseId: string): Promise<void> {
  try {
    await apiFetch(`/users/${id}/site-access/${warehouseId}`, { method: "DELETE" });
  } catch (err) {
    redirectWithError(id, err);
  }
  revalidatePath(`/users/${id}`);
}
