"use server";

import { redirect } from "next/navigation";
import { apiFetch, ApiError } from "../../../lib/api";

export async function changePasswordAction(formData: FormData): Promise<void> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect(`/account?error=${encodeURIComponent("รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร")}`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/account?error=${encodeURIComponent("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน")}`);
  }

  try {
    await apiFetch("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
  } catch (err) {
    if (err instanceof ApiError) {
      const message = err.message === "Current password is incorrect" ? "รหัสผ่านปัจจุบันไม่ถูกต้อง" : err.message;
      redirect(`/account?error=${encodeURIComponent(message)}`);
    }
    throw err;
  }

  redirect("/account?success=1");
}
