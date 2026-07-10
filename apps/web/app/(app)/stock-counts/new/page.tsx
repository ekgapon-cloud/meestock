import Link from "next/link";
import type { StockCountSheetRow, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { createStockCountAction } from "./actions";

export default async function NewStockCountPage({
  searchParams,
}: {
  searchParams: { warehouseId?: string; error?: string };
}) {
  let warehouses: Warehouse[];
  let sheet: StockCountSheetRow[] = [];
  try {
    warehouses = await apiFetch<Warehouse[]>("/warehouses");
    if (searchParams.warehouseId) {
      sheet = await apiFetch<StockCountSheetRow[]>(
        `/stock-counts/count-sheet?warehouseId=${encodeURIComponent(searchParams.warehouseId)}`,
      );
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  return (
    <div>
      <h1>สร้างใบนับสต๊อก</h1>

      <form method="GET" className="filter-form">
        <select name="warehouseId" defaultValue={searchParams.warehouseId ?? ""} required>
          <option value="" disabled>
            เลือกคลังที่จะนับ
          </option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
              {warehouse.project ? ` — ${warehouse.project.name}` : ""}
            </option>
          ))}
        </select>
        <button type="submit">โหลดรายการวัสดุ</button>
      </form>

      {!searchParams.warehouseId ? (
        <p className="empty-state">เลือกคลังก่อนเพื่อเริ่มนับสต๊อก</p>
      ) : sheet.length === 0 ? (
        <p className="empty-state">คลังนี้ไม่มีวัสดุคงเหลือให้นับ</p>
      ) : (
        <form action={createStockCountAction} className="form-page form-page-wide">
          {searchParams.error && <div className="error-banner">{searchParams.error}</div>}
          <input type="hidden" name="warehouseId" value={searchParams.warehouseId} />

          <p className="hint">
            ยอดในระบบแสดงไว้ให้เทียบ กรอกยอดที่นับได้จริง — ถ้าต่างจากระบบต้องระบุเหตุผลด้วย ระบบจะปรับยอด (ADJUSTMENT) ให้อัตโนมัติ
          </p>

          <table>
            <thead>
              <tr>
                <th>วัสดุ</th>
                <th>ยอดในระบบ</th>
                <th>นับได้จริง</th>
                <th>เหตุผล (ถ้าต่างจากระบบ)</th>
              </tr>
            </thead>
            <tbody>
              {sheet.map((row) => (
                <tr key={row.materialId}>
                  <td>
                    {row.material.code} — {row.material.name}
                    <input type="hidden" name="materialId" value={row.materialId} />
                  </td>
                  <td>
                    {row.systemQty} {row.material.unit}
                  </td>
                  <td>
                    <input type="number" name="actualQty" min="0" step="0.01" defaultValue={row.systemQty} required />
                  </td>
                  <td>
                    <input type="text" name="reason" placeholder="เช่น วัสดุชำรุด, นับประจำเดือน" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="form-actions">
            <button type="submit">บันทึกการนับสต๊อก</button>
            <Link href="/stock-counts">ยกเลิก</Link>
          </div>
        </form>
      )}
    </div>
  );
}
