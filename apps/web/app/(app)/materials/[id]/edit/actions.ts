"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../../../lib/api";

export async function updateMaterialAction(id: string, formData: FormData): Promise<void> {
  const barcode = String(formData.get("barcode") ?? "").trim();

  const payload = {
    code: String(formData.get("code") ?? ""),
    barcode: barcode || null,
    name: String(formData.get("name") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    standardCost: String(formData.get("standardCost") ?? "0"),
  };

  try {
    await apiFetch(`/materials/${id}`, { method: "PATCH", body: payload });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/materials/${id}/edit?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/materials");
  redirect("/materials");
}
