import Link from "next/link";
import type {
  GoodsReceiveListResponse,
  IssueHistoryReport,
  IssueStatus,
  LowStockReport,
  MaterialIssueListResponse,
  Me,
  SiteFinancialSummaryReport,
  SiteProgressReport,
  StockValueReport,
  Warehouse,
} from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";
import { Logo } from "../../../components/Logo";

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

function canViewFinancialReports(me: Me) {
  return me.accessLevel === "MANAGER" || me.accessLevel === "ADMIN";
}

export default async function ReportsIndexPage() {
  let me: Me;
  try {
    me = await apiFetch<Me>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  let warehouses: Warehouse[];
  let lowStock: LowStockReport;
  let siteProgress: SiteProgressReport;
  let issueActivity: MaterialIssueListResponse;
  let receiveActivity: GoodsReceiveListResponse;
  try {
    [warehouses, lowStock, siteProgress, issueActivity, receiveActivity] = await Promise.all([
      apiFetch<Warehouse[]>("/warehouses"),
      apiFetch<LowStockReport>("/reports/low-stock"),
      apiFetch<SiteProgressReport>("/reports/site-progress"),
      apiFetch<MaterialIssueListResponse>("/material-issues?limit=1"),
      apiFetch<GoodsReceiveListResponse>("/goods-receives?limit=1"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const financialViewer = canViewFinancialReports(me);
  let stockValue: StockValueReport | null = null;
  let issueHistory: IssueHistoryReport | null = null;
  let siteSummary: SiteFinancialSummaryReport | null = null;
  let topValueSites: SiteFinancialSummaryReport["sites"] = [];
  let maxSiteValue = 1;
  if (financialViewer) {
    [stockValue, issueHistory, siteSummary] = await Promise.all([
      apiFetch<StockValueReport>("/reports/stock-value"),
      apiFetch<IssueHistoryReport>("/reports/issue-history?limit=1"),
      apiFetch<SiteFinancialSummaryReport>("/reports/site-summary"),
    ]);
    topValueSites = [...siteSummary.sites].sort((a, b) => b.remainingValue - a.remainingValue).slice(0, 3);
    maxSiteValue = Math.max(1, ...topValueSites.map((s) => s.remainingValue));
  }

  const statusEntries = Object.entries(issueActivity.summary.countByStatus) as [IssueStatus, number][];

  return (
    <div>
      <div className="page-header-title" style={{ marginBottom: "1rem" }}>
        <Logo variant="icon" size={44} />
        <h1>รายงาน</h1>
      </div>

      <h2>รายงานทั่วไป</h2>
      <div className="report-hub-grid">
        <Link href="/reports/stock-balance" className="report-hub-card">
          <div className="stat-label">สต๊อกคงเหลือ</div>
          <div className="stat-value">{warehouses.length} ไซต์งาน</div>
          <div className="report-hub-sub">ตรวจสอบจำนวนคงเหลือแยกตามไซต์งาน</div>
          <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
        </Link>

        <Link href="/reports/low-stock" className="report-hub-card">
          <div className="stat-label">วัสดุต่ำกว่าจุดสั่งซื้อ</div>
          <div className="stat-value">{lowStock.items.length} รายการ</div>
          {lowStock.items.length > 0 && <span className="severity-pill warn">ต้องพิจารณาสั่งซื้อเพิ่ม</span>}
          <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
        </Link>

        <Link href="/reports/issue-activity" className="report-hub-card">
          <div className="stat-label">กิจกรรมการเบิกจ่าย</div>
          <div className="stat-value">{issueActivity.total} ใบเบิก</div>
          {statusEntries.length > 0 && (
            <div className="report-hub-status-row">
              {statusEntries.map(([status, count]) => (
                <span className={`status-badge status-${status.toLowerCase()}`} key={status}>
                  {STATUS_LABELS[status] ?? status} {count}
                </span>
              ))}
            </div>
          )}
          <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
        </Link>

        <Link href="/reports/receive-activity" className="report-hub-card">
          <div className="stat-label">กิจกรรมการรับวัสดุ</div>
          <div className="stat-value">{receiveActivity.total} ใบรับวัสดุ</div>
          <div className="report-hub-sub">ประวัติการรับวัสดุเข้าคลัง</div>
          <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
        </Link>

        <Link href="/reports/site-progress" className="report-hub-card">
          <div className="stat-label">สัดส่วนสต๊อกตามไซต์</div>
          <div className="stat-value">{siteProgress.sites.length} ไซต์ที่ยังไม่จบ</div>
          <div className="report-hub-sub">แสดงเป็นเปอร์เซ็นต์ ไม่มีมูลค่าเงิน</div>
          <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
        </Link>
      </div>

      {financialViewer && stockValue && issueHistory && siteSummary && (
        <>
          <h2>รายงานการเงิน</h2>
          <div className="report-hub-grid">
            <Link href="/reports/stock-value" className="report-hub-card">
              <div className="stat-label">มูลค่าสต๊อก</div>
              <div className="stat-value">{formatCurrency(stockValue.totalValue)}</div>
              <div className="report-hub-sub">ตามคลัง {stockValue.valueByWarehouse.length} แห่ง</div>
              {topValueSites.length > 0 && (
                <div className="hbar-chart">
                  {topValueSites.map((site) => (
                    <div className="hbar-row" key={site.warehouseId}>
                      <span className="hbar-label">{site.warehouseName}</span>
                      <div className="hbar-track">
                        <div
                          className="hbar-fill"
                          style={{ width: `${Math.max(4, (site.remainingValue / maxSiteValue) * 100)}%` }}
                        />
                      </div>
                      <span className="hbar-value">{formatCurrency(site.remainingValue)}</span>
                    </div>
                  ))}
                </div>
              )}
              <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
            </Link>

            <Link href="/reports/issue-history" className="report-hub-card">
              <div className="stat-label">ประวัติการเบิกจ่าย</div>
              <div className="stat-value">{formatCurrency(issueHistory.summary.totalIssuedValue)}</div>
              <div className="report-hub-sub">มูลค่าที่เบิกไปแล้วทั้งหมด</div>
              <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
            </Link>

            <Link href="/reports/site-summary" className="report-hub-card">
              <div className="stat-label">สรุปการเงินตามไซต์งาน</div>
              <div className="stat-value">{siteSummary.sites.length} ไซต์</div>
              <div className="report-hub-stats">
                <div>
                  <span className="report-hub-stats-label">คงเหลือ</span>
                  <span>{formatCurrency(siteSummary.totals.totalRemainingValue)}</span>
                </div>
                <div>
                  <span className="report-hub-stats-label">เบิกใช้ไป</span>
                  <span>{formatCurrency(siteSummary.totals.totalIssuedValue)}</span>
                </div>
                <div>
                  <span className="report-hub-stats-label">รับเข้า</span>
                  <span>{formatCurrency(siteSummary.totals.totalReceivedValue)}</span>
                </div>
              </div>
              {siteSummary.totals.totalLowStockCount > 0 && (
                <span className="severity-pill warn">ต่ำกว่าจุดสั่งซื้อ {siteSummary.totals.totalLowStockCount} รายการ</span>
              )}
              <span className="report-hub-cta">ดูรายงานแบบละเอียด →</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
