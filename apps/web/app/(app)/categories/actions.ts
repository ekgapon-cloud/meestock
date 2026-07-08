"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "../../../lib/api";

function redirectWithError(err: unknown): never {
  if (err instanceof ApiError) {
    redirect(`/categories?error=${encodeURIComponent(err.message)}`);
  }
  throw err;
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(`/categories?error=${encodeURIComponent("กรุณาระบุชื่อหมวดหมู่")}`);
  }

  try {
    await apiFetch("/categories", { method: "POST", body: { name } });
  } catch (err) {
    redirectWithError(err);
  }
  revalidatePath("/categories");
}

export async function updateCategoryAction(id: string, formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect(`/categories?error=${encodeURIComponent("กรุณาระบุชื่อหมวดหมู่")}`);
  }

  try {
    await apiFetch(`/categories/${id}`, { method: "PATCH", body: { name } });
  } catch (err) {
    redirectWithError(err);
  }
  revalidatePath("/categories");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  try {
    await apiFetch(`/categories/${id}`, { method: "DELETE" });
  } catch (err) {
    redirectWithError(err);
  }
  revalidatePath("/categories");
}
