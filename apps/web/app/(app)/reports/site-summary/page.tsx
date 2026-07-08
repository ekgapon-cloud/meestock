import Link from "next/link";
import { redirect } from "next/navigation";
import type { SiteFinancialSummaryReport } from "shared-types";
import { apiFetch, ApiError } from "../../../../lib/api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

export default async function SiteFinancialSummaryPage({
  searchParams,
}: {
  searchParams: { dateFrom?: string; dateTo?: string };
}) {
  const query = new URLSearchParams();
  if (searchParams.dateFrom) query.set("dateFrom", searchParams.dateFrom);
  if (searchParams.dateTo) query.set("dateTo", searchParams.dateTo);

  let report: SiteFinancialSummaryReport;
  try {
    report = await apiFetch<SiteFinancialSummaryReport>(`/reports/site-summary?${query.toString()}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 403) {
        return <div className="empty-state">บัญชีนี้ไม่มีสิทธิ์ดูรายงานนี้ (ต้องเป็น accessLevel MANAGER หรือ ADMIN)</div>;
      }
    }
    throw err;
  }

  const hasDateFilter = Boolean(searchParams.dateFrom || searchParams.dateTo);
  const periodSuffix = hasDateFilter ? " (ตามช่วงที่กรอง)" : " (สะสมทั้งหมด)";
  const maxRemaining = Math.max(...report.sites.map((s) => s.remainingValue), 1);

  return (
    <div>
      <h1>สรุปการเงินตามไซต์งาน</h1>

      <form method="GET" className="filter-form">
        <input type="date" name="dateFrom" defaultValue={searchParams.dateFrom ?? ""} />
        <input type="date" name="dateTo" defaultValue={searchParams.dateTo ?? ""} />
        <button type="submit">กรอง</button>
      </form>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">มูลค่าคงเหลือรวมทุกไซต์</div>
          <div className="stat-value">{formatCurrency(report.totals.totalRemainingValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">มูลค่าที่เบิกใช้{periodSuffix}</div>
          <div className="stat-value">{formatCurrency(report.totals.totalIssuedValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">มูลค่ารับเข้า{periodSuffix}</div>
          <div className="stat-value">{formatCurrency(report.totals.totalReceivedValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">รายการต่ำกว่าจุดสั่งซื้อ</div>
          <div className="stat-value">{report.totals.totalLowStockCount}</div>
        </div>
      </div>

      <h2>เปรียบเทียบมูลค่าคงเหลือตามไซต์</h2>
      {report.sites.length === 0 ? (
        <p className="empty-state">ไม่มีข้อมูล</p>
      ) : (
        <div className="hbar-chart">
          {report.sites.map((site) => (
            <div className="hbar-row" key={site.warehouseId}>
              <span className="hbar-label">{site.warehouseName}</span>
              <div className="hbar-track">
                <div
                  className="hbar-fill"
                  style={{ width: `${(site.remainingValue / maxRemaining) * 100}%` }}
                  title={`${site.warehouseName}: ${formatCurrency(site.remainingValue)}`}
                />
              </div>
              <span className="hbar-value">{formatCurrency(site.remainingValue)}</span>
            </div>
          ))}
        </div>
      )}

      <h2>รายละเอียดตามไซต์งาน</h2>
      {report.sites.length === 0 ? (
        <p className="empty-state">ไม่มีข้อมูล</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ไซต์งาน</th>
              <th>โครงการ</th>
              <th>คงเหลือ</th>
              <th>เบิกใช้ไป</th>
              <th>รับเข้า</th>
              <th>งบวัสดุ</th>
              <th>ใช้งบไป</th>
              <th>ต่ำกว่าจุดสั่งซื้อ</th>
            </tr>
          </thead>
          <tbody>
            {report.sites.map((site) => (
              <tr key={site.warehouseId}>
                <td>
                  <Link href={`/reports/site-summary/${site.warehouseId}`}>{site.warehouseName}</Link>
                </td>
                <td>{site.projectName ?? "-"}</td>
                <td>{formatCurrency(site.remainingValue)}</td>
                <td>{formatCurrency(site.issuedValue)}</td>
                <td>{formatCurrency(site.receivedValue)}</td>
                <td>{site.materialBudget !== null ? formatCurrency(site.materialBudget) : "-"}</td>
                <td>
                  {site.budgetUtilizationPct !== null ? (
                    <div className="budget-bar-wrap">
                      <div className="budget-bar-track">
                        <div
                          className={`budget-bar-fill${site.budgetUtilizationPct > 100 ? " budget-bar-over" : ""}`}
                          style={{ width: `${Math.min(100, site.budgetUtilizationPct)}%` }}
                        />
                      </div>
                      <span>{site.budgetUtilizationPct.toFixed(0)}%</span>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {site.lowStockCount > 0 ? (
                    <span className="status-badge status-rejected">{site.lowStockCount}</span>
                  ) : (
                    "-"
                  )}
                </td>
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
