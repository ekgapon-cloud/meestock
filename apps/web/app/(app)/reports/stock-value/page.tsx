import Link from "next/link";
import type { StockValueReport, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

export default async function StockValueReportPage({
  searchParams,
}: {
  searchParams: { warehouseId?: string };
}) {
  const query = new URLSearchParams();
  if (searchParams.warehouseId) {
    query.set("warehouseId", searchParams.warehouseId);
  }

  let report: StockValueReport;
  let warehouses: Warehouse[];
  try {
    [report, warehouses] = await Promise.all([
      apiFetch<StockValueReport>(`/reports/stock-value?${query.toString()}`),
      apiFetch<Warehouse[]>("/warehouses"),
    ]);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 403) {
        return <div className="empty-state">บัญชีนี้ไม่มีสิทธิ์ดูรายงานนี้ (ต้องเป็น accessLevel MANAGER หรือ ADMIN)</div>;
      }
    }
    throw err;
  }

  const warehouseNameById = new Map(warehouses.map((w) => [w.id, w.name]));

  return (
    <div>
      <h1>มูลค่าสต๊อกคงเหลือ</h1>

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
          <div className="stat-label">มูลค่าสต๊อกรวม</div>
          <div className="stat-value">{formatCurrency(report.totalValue)}</div>
        </div>
      </div>

      <h2>แยกตามไซต์งาน</h2>
      {report.valueByWarehouse.length === 0 ? (
        <p className="empty-state">ไม่มีข้อมูล</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ไซต์งาน</th>
              <th>มูลค่า</th>
            </tr>
          </thead>
          <tbody>
            {report.valueByWarehouse.map((row) => (
              <tr key={row.warehouseId}>
                <td>{warehouseNameById.get(row.warehouseId) ?? row.warehouseId}</td>
                <td>{formatCurrency(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>รายละเอียดตามวัสดุ</h2>
      {report.items.length === 0 ? (
        <p className="empty-state">ไม่มีข้อมูล</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>วัสดุ</th>
              <th>ไซต์งาน</th>
              <th>คงเหลือ</th>
              <th>ต้นทุนเฉลี่ย/หน่วย</th>
              <th>มูลค่า</th>
            </tr>
          </thead>
          <tbody>
            {report.items.map((item, index) => (
              <tr key={`${item.materialId}-${item.warehouseId}-${index}`}>
                <td>{item.materialCode ?? "-"}</td>
                <td>{item.materialName ?? "-"}</td>
                <td>{warehouseNameById.get(item.warehouseId) ?? item.warehouseId}</td>
                <td>{item.balance}</td>
                <td>{formatCurrency(item.avgCost)}</td>
                <td>{formatCurrency(item.value)}</td>
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
