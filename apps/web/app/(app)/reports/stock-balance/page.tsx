import Link from "next/link";
import type { Material, StockBalanceReport, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";

export default async function StockBalanceReportPage({
  searchParams,
}: {
  searchParams: { warehouseId?: string };
}) {
  let warehouses: Warehouse[];
  try {
    warehouses = await apiFetch<Warehouse[]>("/warehouses");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const warehouseId = searchParams.warehouseId ?? warehouses[0]?.id;

  if (!warehouseId) {
    return (
      <div>
        <h1>สต๊อกคงเหลือ</h1>
        <p className="empty-state">ไม่มีไซต์งานที่เข้าถึงได้</p>
        <p>
          <Link href="/reports">← กลับไปหน้ารายงาน</Link>
        </p>
      </div>
    );
  }

  let balance: StockBalanceReport;
  try {
    balance = await apiFetch<StockBalanceReport>(`/stock/balance?warehouseId=${warehouseId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const nonZero = balance.items.filter((item) => item.balance !== 0);
  const materials = await Promise.all(nonZero.map((item) => apiFetch<Material>(`/materials/${item.materialId}`)));
  const materialById = new Map(materials.map((m) => [m.id, m]));

  const rows = nonZero
    .map((item) => ({ ...item, material: materialById.get(item.materialId) }))
    .sort((a, b) => (a.material?.name ?? "").localeCompare(b.material?.name ?? "", "th"));

  return (
    <div>
      <h1>สต๊อกคงเหลือ</h1>

      <form method="GET" className="filter-form">
        <select name="warehouseId" defaultValue={warehouseId}>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <button type="submit">ดู</button>
      </form>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">รายการที่มีสต๊อก</div>
          <div className="stat-value">{rows.length}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">ไม่มีสต๊อกคงเหลือในไซต์นี้</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>วัสดุ</th>
              <th>หน่วย</th>
              <th>คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.materialId}>
                <td>{row.material?.code ?? row.materialId}</td>
                <td>{row.material?.name ?? "-"}</td>
                <td>{row.material?.unit ?? "-"}</td>
                <td>{row.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p>
        <Link href="/reports">← กลับไปหน้ารายงาน</Link>
      </p>
    </div>
  );
}
