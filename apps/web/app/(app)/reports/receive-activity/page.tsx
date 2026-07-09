import Link from "next/link";
import type { GoodsReceiveListResponse, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ReceiveActivityReportPage({
  searchParams,
}: {
  searchParams: { warehouseId?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (searchParams.warehouseId) query.set("warehouseId", searchParams.warehouseId);

  let report: GoodsReceiveListResponse;
  let warehouses: Warehouse[];
  try {
    [report, warehouses] = await Promise.all([
      apiFetch<GoodsReceiveListResponse>(`/goods-receives?${query.toString()}`),
      apiFetch<Warehouse[]>("/warehouses"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const totalPages = Math.max(1, Math.ceil(report.total / report.limit));
  const suffixStr = searchParams.warehouseId ? `&warehouseId=${searchParams.warehouseId}` : "";

  return (
    <div>
      <h1>กิจกรรมการรับวัสดุ</h1>

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
          <div className="stat-label">ใบรับวัสดุทั้งหมด</div>
          <div className="stat-value">{report.total}</div>
        </div>
      </div>

      {report.items.length === 0 ? (
        <p className="empty-state">ไม่พบข้อมูล</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ไซต์งาน</th>
              <th>ผู้ขาย / ใบสั่งซื้อ</th>
              <th>จำนวนรายการ</th>
              <th>ผู้บันทึก</th>
            </tr>
          </thead>
          <tbody>
            {report.items.map((gr) => (
              <tr key={gr.id}>
                <td>
                  <Link href={`/goods-receives/${gr.id}`}>{gr.docNo}</Link>
                </td>
                <td>{formatDate(gr.date)}</td>
                <td>{gr.warehouse.name}</td>
                <td>{gr.supplier?.name ?? gr.purchaseOrder?.docNo ?? "-"}</td>
                <td>{gr.items.length}</td>
                <td>{gr.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/reports/receive-activity?page=${page - 1}${suffixStr}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/reports/receive-activity?page=${page + 1}${suffixStr}`}>ถัดไป</Link>}
      </div>

      <p>
        <Link href="/reports">← กลับไปหน้ารายงาน</Link>
      </p>
    </div>
  );
}
