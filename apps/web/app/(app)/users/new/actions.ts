"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "../../../../lib/api";

export async function createUserAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  const accessLevel = String(formData.get("accessLevel") ?? "STAFF");

  try {
    await apiFetch("/users", { method: "POST", body: { name, email, password, role, accessLevel } });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/users/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/users");
  redirect("/users");
}
