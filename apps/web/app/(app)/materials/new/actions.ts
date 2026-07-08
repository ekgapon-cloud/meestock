"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../../lib/api";

export async function createMaterialAction(formData: FormData): Promise<void> {
  const barcode = String(formData.get("barcode") ?? "").trim();

  const payload = {
    code: String(formData.get("code") ?? ""),
    ...(barcode ? { barcode } : {}),
    name: String(formData.get("name") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    standardCost: String(formData.get("standardCost") ?? "0"),
  };

  try {
    await apiFetch("/materials", { method: "POST", body: payload });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/materials/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/materials");
  redirect("/materials");
}
