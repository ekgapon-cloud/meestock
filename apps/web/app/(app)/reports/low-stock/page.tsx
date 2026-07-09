import Link from "next/link";
import type { LowStockReport, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";

/** Below-reorder-point items are already a shortage; anything under 30% of the reorder point reads as critical, not just low. */
function severity(balance: number, reorderPoint: number): "warn" | "crit" {
  return balance <= reorderPoint * 0.3 ? "crit" : "warn";
}

export default async function LowStockReportPage({
  searchParams,
}: {
  searchParams: { warehouseId?: string };
}) {
  const query = new URLSearchParams();
  if (searchParams.warehouseId) query.set("warehouseId", searchParams.warehouseId);

  let report: LowStockReport;
  let warehouses: Warehouse[];
  try {
    [report, warehouses] = await Promise.all([
      apiFetch<LowStockReport>(`/reports/low-stock?${query.toString()}`),
      apiFetch<Warehouse[]>("/warehouses"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const critCount = report.items.filter((m) => severity(m.balance, m.reorderPoint) === "crit").length;
  const sorted = [...report.items].sort(
    (a, b) => a.balance / Math.max(1, a.reorderPoint) - b.balance / Math.max(1, b.reorderPoint),
  );

  return (
    <div>
      <h1>วัสดุต่ำกว่าจุดสั่งซื้อ</h1>

      <form method="GET" className="filter-form">
        <select name="warehouseId" defaultValue={searchParams.warehouseId ?? ""}>
          <option value="">ทุกไซต์งาน</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <button type="submit">กรอง</button>
      </form>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">รายการทั้งหมด</div>
          <div className="stat-value">{report.items.length}</div>
        </div>
        <div className="stat-tile">
          <div className={`stat-value${critCount > 0 ? " crit" : ""}`}>{critCount}</div>
          <div className="stat-label">วิกฤต (คงเหลือ ≤ 30% ของจุดสั่งซื้อ)</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="empty-state">ไม่มีวัสดุต่ำกว่าจุดสั่งซื้อ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วัสดุ</th>
              <th>คงเหลือ</th>
              <th>จุดสั่งซื้อ</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const s = severity(m.balance, m.reorderPoint);
              return (
                <tr className={`severity-row ${s}`} key={`${m.materialId}-${m.warehouseId}-${i}`}>
                  <td>{m.materialName}</td>
                  <td>{m.balance}</td>
                  <td>{m.reorderPoint}</td>
                  <td>
                    <span className={`severity-pill ${s}`}>{s === "crit" ? "วิกฤต" : "ต่ำ"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p>
        <Link href="/reports">← กลับไปหน้ารายงาน</Link>
      </p>
    </div>
  );
}
