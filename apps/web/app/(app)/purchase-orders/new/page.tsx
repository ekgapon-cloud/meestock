import Link from "next/link";
import { redirect } from "next/navigation";
import type { MaterialListResponse, Supplier } from "shared-types";
import { apiFetch, ApiError } from "../../../../lib/api";
import { CostedItemsField } from "../../../../components/CostedItemsField";
import { createPurchaseOrderAction } from "./actions";

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: { error?: string } }) {
  let suppliers: Supplier[];
  let materialsData: MaterialListResponse;
  try {
    [suppliers, materialsData] = await Promise.all([
      apiFetch<Supplier[]>("/suppliers"),
      apiFetch<MaterialListResponse>("/materials?limit=100"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/api/auth/logout");
    }
    throw err;
  }

  return (
    <div>
      <h1>สร้างใบสั่งซื้อ</h1>
      <form action={createPurchaseOrderAction} className="form-page form-page-wide">
        {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

        <label>
          ผู้ขาย
          {suppliers.length === 0 ? (
            <span className="hint">ยังไม่มีผู้ขายในระบบ</span>
          ) : (
            <select name="supplierId" required defaultValue="">
              <option value="" disabled>
                เลือกผู้ขาย
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <CostedItemsField materials={materialsData.items} />

        <div className="form-actions">
          <button type="submit" disabled={suppliers.length === 0}>
            สร้างใบสั่งซื้อ
          </button>
          <Link href="/purchase-orders">ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}
