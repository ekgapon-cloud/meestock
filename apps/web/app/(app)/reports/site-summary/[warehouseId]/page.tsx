import Link from "next/link";
import type { IssueHistoryReport, IssueStatus, SiteFinancialSummaryReport, StockValueReport } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../../lib/api";

const STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  PARTIALLY_FULFILLED: "จ่ายบางส่วน",
  FULFILLED: "จ่ายครบแล้ว",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function SiteFinancialDetailPage({
  params,
  searchParams,
}: {
  params: { warehouseId: string };
  searchParams: { dateFrom?: string; dateTo?: string };
}) {
  const query = new URLSearchParams();
  if (searchParams.dateFrom) query.set("dateFrom", searchParams.dateFrom);
  if (searchParams.dateTo) query.set("dateTo", searchParams.dateTo);

  let summary: SiteFinancialSummaryReport;
  let stockValue: StockValueReport;
  let issueHistory: IssueHistoryReport;
  try {
    [summary, stockValue, issueHistory] = await Promise.all([
      apiFetch<SiteFinancialSummaryReport>(`/reports/site-summary?${query.toString()}`),
      apiFetch<StockValueReport>(`/reports/stock-value?warehouseId=${params.warehouseId}`),
      apiFetch<IssueHistoryReport>(
        `/reports/issue-history?warehouseId=${params.warehouseId}&limit=10&${query.toString()}`,
      ),
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

  const site = summary.sites.find((s) => s.warehouseId === params.warehouseId);
  if (!site) {
    return <div className="empty-state">ไม่พบไซต์งานนี้ หรือไม่มีสิทธิ์เข้าถึง</div>;
  }

  const backSuffix = query.toString() ? `?${query.toString()}` : "";

  return (
    <div>
      <h1>{site.warehouseName}</h1>
      {site.projectName && (
        <p className="hint">
          โครงการ: {site.projectName} ({site.projectCode})
        </p>
      )}

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">มูลค่าคงเหลือ</div>
          <div className="stat-value">{formatCurrency(site.remainingValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">มูลค่าที่เบิกใช้</div>
          <div className="stat-value">{formatCurrency(site.issuedValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">มูลค่ารับเข้า</div>
          <div className="stat-value">{formatCurrency(site.receivedValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ต่ำกว่าจุดสั่งซื้อ</div>
          <div className="stat-value">{site.lowStockCount} รายการ</div>
        </div>
      </div>

      {site.contractValue !== null && (
        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-label">มูลค่าสัญญา</div>
            <div className="stat-value-sm">{formatCurrency(site.contractValue)}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-label">งบประมาณวัสดุ</div>
            <div className="stat-value-sm">
              {site.materialBudget !== null ? formatCurrency(site.materialBudget) : "ไม่ระบุ"}
            </div>
          </div>
          {site.budgetUtilizationPct !== null && (
            <div className="stat-tile">
              <div className="stat-label">ใช้งบวัสดุไปแล้ว</div>
              <div className="stat-value-sm">{site.budgetUtilizationPct.toFixed(1)}%</div>
            </div>
          )}
        </div>
      )}

      <h2>วัสดุคงเหลือในไซต์นี้</h2>
      {stockValue.items.length === 0 ? (
        <p className="empty-state">ไม่มีวัสดุคงเหลือ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>วัสดุ</th>
              <th>คงเหลือ</th>
              <th>ต้นทุนเฉลี่ย/หน่วย</th>
              <th>มูลค่า</th>
            </tr>
          </thead>
          <tbody>
            {stockValue.items.map((item, index) => (
              <tr key={`${item.materialId}-${index}`}>
                <td>{item.materialCode ?? "-"}</td>
                <td>{item.materialName ?? "-"}</td>
                <td>{item.balance}</td>
                <td>{formatCurrency(item.avgCost)}</td>
                <td>{formatCurrency(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>ประวัติการเบิกจ่ายล่าสุด</h2>
      {issueHistory.items.length === 0 ? (
        <p className="empty-state">ไม่มีข้อมูล</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ผู้ขอเบิก</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {issueHistory.items.map((issue) => (
              <tr key={issue.id}>
                <td>
                  <Link href={`/material-issues/${issue.id}`}>{issue.docNo}</Link>
                </td>
                <td>{formatDate(issue.date)}</td>
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
      {issueHistory.total > issueHistory.items.length && (
        <p>
          <Link href={`/reports/issue-history?warehouseId=${params.warehouseId}`}>
            ดูประวัติการเบิกจ่ายทั้งหมด ({issueHistory.total} รายการ) →
          </Link>
        </p>
      )}

      <p>
        <Link href={`/reports/site-summary${backSuffix}`}>← กลับไปสรุปการเงินตามไซต์งาน</Link>
      </p>
    </div>
  );
}
