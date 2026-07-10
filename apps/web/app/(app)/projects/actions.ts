"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ProjectStatus } from "shared-types";
import { apiFetch, ApiError } from "../../../lib/api";

export async function createProjectAction(formData: FormData): Promise<void> {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const customerChoice = String(formData.get("customerChoice") ?? "");
  const newCustomerName = String(formData.get("newCustomerName") ?? "").trim();
  const newCustomerContact = String(formData.get("newCustomerContact") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const contractValue = String(formData.get("contractValue") ?? "0");
  const warehouseName = String(formData.get("warehouseName") ?? "").trim();

  const body: Record<string, unknown> = {
    code,
    name,
    startDate,
    contractValue,
    ...(endDate ? { endDate } : {}),
    ...(warehouseName ? { warehouseName } : {}),
  };
  // "__new__" means create a customer inline; anything else is an existing customer id.
  if (customerChoice === "__new__") {
    body.newCustomerName = newCustomerName;
    if (newCustomerContact) body.newCustomerContact = newCustomerContact;
  } else {
    body.customerId = customerChoice;
  }

  if (!code || !name || !startDate) {
    redirect(`/projects/new?error=${encodeURIComponent("กรุณากรอกรหัส ชื่อโครงการ และวันที่เริ่ม")}`);
  }

  try {
    await apiFetch("/projects", { method: "POST", body });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/projects/new?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath("/projects");
  redirect("/projects");
}

export async function setProjectStatusAction(id: string, status: ProjectStatus): Promise<void> {
  try {
    await apiFetch(`/projects/${id}/status`, { method: "PATCH", body: { status } });
  } catch (err) {
    if (err instanceof ApiError) {
      redirect(`/projects/${id}?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}
