"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../../../lib/api";

export async function deactivateMaterialAction(id: string): Promise<void> {
  await apiFetch(`/materials/${id}`, { method: "DELETE" });
  revalidatePath("/materials");
}
