import Link from "next/link";
import type { IssueStatus, MaterialIssueListResponse, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";

const STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  PARTIALLY_FULFILLED: "จ่ายบางส่วน",
  FULFILLED: "จ่ายครบแล้ว",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function IssueActivityReportPage({
  searchParams,
}: {
  searchParams: { warehouseId?: string; dateFrom?: string; dateTo?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (searchParams.warehouseId) query.set("warehouseId", searchParams.warehouseId);
  if (searchParams.dateFrom) query.set("dateFrom", searchParams.dateFrom);
  if (searchParams.dateTo) query.set("dateTo", searchParams.dateTo);

  let report: MaterialIssueListResponse;
  let warehouses: Warehouse[];
  try {
    [report, warehouses] = await Promise.all([
      apiFetch<MaterialIssueListResponse>(`/material-issues?${query.toString()}`),
      apiFetch<Warehouse[]>("/warehouses"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const totalPages = Math.max(1, Math.ceil(report.total / report.limit));
  const suffix = new URLSearchParams();
  if (searchParams.warehouseId) suffix.set("warehouseId", searchParams.warehouseId);
  if (searchParams.dateFrom) suffix.set("dateFrom", searchParams.dateFrom);
  if (searchParams.dateTo) suffix.set("dateTo", searchParams.dateTo);
  const suffixStr = suffix.toString() ? `&${suffix.toString()}` : "";
  const statusEntries = Object.entries(report.summary.countByStatus) as [IssueStatus, number][];

  return (
    <div>
      <h1>กิจกรรมการเบิกจ่าย</h1>

      <form method="GET" className="filter-form">
        <select name="warehouseId" defaultValue={searchParams.warehouseId ?? ""}>
          <option value="">ทุกไซต์งาน</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <input type="date" name="dateFrom" defaultValue={searchParams.dateFrom ?? ""} />
        <input type="date" name="dateTo" defaultValue={searchParams.dateTo ?? ""} />
        <button type="submit">กรอง</button>
      </form>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกทั้งหมด</div>
          <div className="stat-value">{report.total}</div>
        </div>
        {statusEntries.map(([status, count]) => (
          <div className="stat-tile" key={status}>
            <div className="stat-label">{STATUS_LABELS[status] ?? status}</div>
            <div className="stat-value">{count}</div>
          </div>
        ))}
      </div>

      {report.items.length === 0 ? (
        <p className="empty-state">ไม่พบข้อมูล</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>โครงการ</th>
              <th>ผู้ขอเบิก</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {report.items.map((issue) => (
              <tr key={issue.id}>
                <td>
                  <Link href={`/material-issues/${issue.id}`}>{issue.docNo}</Link>
                </td>
                <td>{formatDate(issue.date)}</td>
                <td>{issue.project.name}</td>
                <td>{issue.requester.name}</td>
                <td>
                  <span className={`status-badge status-${issue.status.toLowerCase()}`}>
                    {STATUS_LABELS[issue.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/reports/issue-activity?page=${page - 1}${suffixStr}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/reports/issue-activity?page=${page + 1}${suffixStr}`}>ถัดไป</Link>}
      </div>

      <p>
        <Link href="/reports">← กลับไปหน้ารายงาน</Link>
      </p>
    </div>
  );
}
