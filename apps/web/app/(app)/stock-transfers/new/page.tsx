import Link from "next/link";
import type { MaterialListResponse, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { SubmitButton } from "../../../../components/SubmitButton";
import { TransferItemsField } from "./TransferItemsField";
import { createStockTransferAction } from "./actions";

export default async function NewStockTransferPage({ searchParams }: { searchParams: { error?: string } }) {
  let warehouses: Warehouse[];
  let materialsData: MaterialListResponse;
  try {
    [warehouses, materialsData] = await Promise.all([
      apiFetch<Warehouse[]>("/warehouses"),
      apiFetch<MaterialListResponse>("/materials?limit=100"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  return (
    <div>
      <h1>สร้างใบโอนย้ายวัสดุ</h1>
      <form action={createStockTransferAction} className="form-page form-page-wide">
        {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

        <label>
          จากคลัง (ต้นทาง)
          <select name="fromWarehouseId" required defaultValue="">
            <option value="" disabled>
              เลือกคลังต้นทาง
            </option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
                {warehouse.project ? ` — ${warehouse.project.name}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          ไปคลัง (ปลายทาง)
          <select name="toWarehouseId" required defaultValue="">
            <option value="" disabled>
              เลือกคลังปลายทาง
            </option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
                {warehouse.project ? ` — ${warehouse.project.name}` : ""}
              </option>
            ))}
          </select>
          <span className="hint">ต้นทุนเฉลี่ยของวัสดุจะถูกยกตามไปคลังปลายทางโดยอัตโนมัติ ไม่ต้องกรอกเอง</span>
        </label>

        <TransferItemsField materials={materialsData.items} />

        <div className="form-actions">
          <SubmitButton>บันทึกการโอนย้าย</SubmitButton>
          <Link href="/stock-transfers">ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}
