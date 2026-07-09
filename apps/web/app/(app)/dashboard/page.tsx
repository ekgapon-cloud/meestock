import type { ExecutiveDashboard, IssueStatus, Me, StaffDashboard } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";
import { Logo } from "../../../components/Logo";
import { ProjectValueDonut } from "../../../components/ProjectValueDonut";
import { SiteDetailTable } from "../../../components/SiteDetailTable";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

const STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  PARTIALLY_FULFILLED: "จ่ายบางส่วน",
  FULFILLED: "จ่ายครบแล้ว",
};

/** Below-reorder-point items are already a shortage; anything under 30% of the reorder point reads as critical, not just low. */
function lowStockSeverity(balance: number, reorderPoint: number): "warn" | "crit" {
  return balance <= reorderPoint * 0.3 ? "crit" : "warn";
}

function isExecutiveViewer(me: Me) {
  return me.role === "EXECUTIVE" && (me.accessLevel === "MANAGER" || me.accessLevel === "ADMIN");
}

export default async function DashboardPage() {
  let me: Me;
  try {
    me = await apiFetch<Me>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  return isExecutiveViewer(me) ? <ExecutiveDashboardSection /> : <StaffDashboardSection />;
}

async function ExecutiveDashboardSection() {
  let dashboard: ExecutiveDashboard;
  try {
    dashboard = await apiFetch<ExecutiveDashboard>("/dashboard/executive");
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 403) {
        return (
          <div className="empty-state">
            บัญชีนี้ไม่มีสิทธิ์เข้าถึง Executive Dashboard (ต้องเป็น role EXECUTIVE และ accessLevel MANAGER/ADMIN)
          </div>
        );
      }
    }
    throw err;
  }

  const trend = dashboard.monthlyIssueTrend;
  const maxTrendValue = Math.max(1, ...trend.map((row) => row.value));
  const latestMonth = trend.length > 0 ? trend[trend.length - 1] : null;
  const maxCostSite = Math.max(1, ...dashboard.topCostSites.map((s) => s.cost));

  return (
    <div>
      <div className="page-header-title" style={{ marginBottom: "1rem" }}>
        <Logo variant="icon" size={44} />
        <h1>Executive dashboard</h1>
      </div>

      <div className="ops-strip">
        <div className="stat-tile">
          <div className="stat-label">มูลค่าสต๊อกรวม</div>
          <div className="stat-value">{formatCurrency(dashboard.totalStockValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกเดือนล่าสุด</div>
          <div className="stat-value">{latestMonth ? latestMonth.count : "-"}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ต่ำกว่าจุดสั่งซื้อ</div>
          <div className={`stat-value${dashboard.lowStockMaterials.length > 0 ? " warn" : ""}`}>
            {dashboard.lowStockMaterials.length} รายการ
          </div>
        </div>
      </div>

      <div className="ops-grid">
        <div className="ops-rail">
          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              สัดส่วนมูลค่าสต๊อกตามไซต์ที่ยังไม่จบโครงการ
            </div>
            <ProjectValueDonut sites={dashboard.activeProjectValueBreakdown.sites} />
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              ไซต์ต้นทุนสูงสุด
            </div>
            {dashboard.topCostSites.length === 0 ? (
              <p className="empty-state">ไม่มีข้อมูล</p>
            ) : (
              <div className="hbar-chart">
                {dashboard.topCostSites.map((s) => (
                  <div className="hbar-row" key={s.warehouseId}>
                    <span className="hbar-label">{s.warehouseName ?? s.warehouseId}</span>
                    <div className="hbar-track">
                      <div className="hbar-fill" style={{ width: `${Math.max(4, (s.cost / maxCostSite) * 100)}%` }} />
                    </div>
                    <span className="hbar-value">{formatCurrency(s.cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ops-main">
          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              วัสดุต่ำกว่าจุดสั่งซื้อ — เรียงตามความเร่งด่วน
            </div>
            {dashboard.lowStockMaterials.length === 0 ? (
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
                  {[...dashboard.lowStockMaterials]
                    .sort((a, b) => a.balance / Math.max(1, a.reorderPoint) - b.balance / Math.max(1, b.reorderPoint))
                    .map((m, i) => {
                      const severity = lowStockSeverity(m.balance, m.reorderPoint);
                      return (
                        <tr className={`severity-row ${severity}`} key={`${m.materialId}-${m.warehouseId}-${i}`}>
                          <td>{m.materialName}</td>
                          <td>{m.balance}</td>
                          <td>{m.reorderPoint}</td>
                          <td>
                            <span className={`severity-pill ${severity}`}>{severity === "crit" ? "วิกฤต" : "ต่ำ"}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.5rem" }}>
              แนวโน้มการเบิกจ่าย (6 เดือนล่าสุด)
            </div>
            {trend.length === 0 ? (
              <p className="empty-state">ไม่มีข้อมูล</p>
            ) : (
              <div className="mini-bars">
                {trend.map((row, i) => (
                  <div
                    key={row.month}
                    className={i === trend.length - 1 ? "mini-bar mini-bar-highlight" : "mini-bar"}
                    style={{ height: `${Math.max(6, (row.value / maxTrendValue) * 100)}%` }}
                    title={`${row.month}: ${formatCurrency(row.value)}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              วัสดุที่เบิกมากที่สุด
            </div>
            {dashboard.topIssuedMaterials.length === 0 ? (
              <p className="empty-state">ไม่มีข้อมูล</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>วัสดุ</th>
                    <th>เบิกแล้ว</th>
                    <th>คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.topIssuedMaterials.map((m) => (
                    <tr key={m.materialId}>
                      <td>{m.materialName ?? m.materialId}</td>
                      <td>{m.issuedQty}</td>
                      <td>{m.remainingQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              รายละเอียดไซต์ที่ยังไม่จบโครงการ
            </div>
            <SiteDetailTable sites={dashboard.activeProjectValueBreakdown.sites} showValue={(site) => formatCurrency(site.value)} />
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              มูลค่าสต๊อกตามไซต์
            </div>
            {dashboard.stockValueByWarehouse.length === 0 ? (
              <p className="empty-state">ไม่มีข้อมูล</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Warehouse ID</th>
                    <th>มูลค่า</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.stockValueByWarehouse.map((row) => (
                    <tr key={row.warehouseId}>
                      <td>{row.warehouseId}</td>
                      <td>{formatCurrency(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function StaffDashboardSection() {
  let dashboard: StaffDashboard;
  try {
    dashboard = await apiFetch<StaffDashboard>("/dashboard/staff");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const statusEntries = Object.entries(dashboard.issueStatusBreakdownThisMonth);
  const maxStatusCount = Math.max(1, ...statusEntries.map(([, count]) => count));

  return (
    <div>
      <div className="page-header-title" style={{ marginBottom: "1rem" }}>
        <Logo variant="icon" size={44} />
        <h1>แดชบอร์ด</h1>
      </div>

      <div className="ops-strip">
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกสัปดาห์นี้</div>
          <div className="stat-value">{dashboard.issuesThisWeek}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบรับสัปดาห์นี้</div>
          <div className="stat-value">{dashboard.receivesThisWeek}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกเดือนนี้</div>
          <div className="stat-value">{dashboard.issuesThisMonth}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบรับเดือนนี้</div>
          <div className="stat-value">{dashboard.receivesThisMonth}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ต่ำกว่าจุดสั่งซื้อ</div>
          <div className={`stat-value${dashboard.lowStockCount > 0 ? " warn" : ""}`}>{dashboard.lowStockCount} รายการ</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกเกินกำหนด</div>
          <div className={`stat-value${dashboard.overdueIssuesCount > 0 ? " crit" : ""}`}>{dashboard.overdueIssuesCount} รายการ</div>
        </div>
      </div>

      <div className="ops-grid">
        <div className="ops-rail">
          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              สัดส่วนสต๊อกตามไซต์ที่ยังไม่จบโครงการ
            </div>
            <ProjectValueDonut sites={dashboard.activeProjectValueBreakdown.sites} />
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              สถานะใบเบิกเดือนนี้
            </div>
            {statusEntries.length === 0 ? (
              <p className="empty-state">ไม่มีข้อมูล</p>
            ) : (
              <div className="hbar-chart">
                {statusEntries.map(([status, count]) => (
                  <div className="hbar-row" key={status}>
                    <span className="hbar-label">
                      <span className={`status-badge status-${status.toLowerCase()}`}>
                        {STATUS_LABELS[status as IssueStatus] ?? status}
                      </span>
                    </span>
                    <div className="hbar-track">
                      <div className="hbar-fill" style={{ width: `${Math.max(4, (count / maxStatusCount) * 100)}%` }} />
                    </div>
                    <span className="hbar-value">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ops-main">
          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              วัสดุต่ำกว่าจุดสั่งซื้อ — เรียงตามความเร่งด่วน
            </div>
            {dashboard.lowStockMaterials.length === 0 ? (
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
                  {[...dashboard.lowStockMaterials]
                    .sort((a, b) => a.balance / Math.max(1, a.reorderPoint) - b.balance / Math.max(1, b.reorderPoint))
                    .map((m, i) => {
                      const severity = lowStockSeverity(m.balance, m.reorderPoint);
                      return (
                        <tr className={`severity-row ${severity}`} key={`${m.materialId}-${m.warehouseId}-${i}`}>
                          <td>{m.materialName}</td>
                          <td>{m.balance}</td>
                          <td>{m.reorderPoint}</td>
                          <td>
                            <span className={`severity-pill ${severity}`}>{severity === "crit" ? "วิกฤต" : "ต่ำ"}</span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              วัสดุที่เบิกมากที่สุด (สัปดาห์นี้)
            </div>
            {dashboard.topIssuedMaterialsThisWeek.length === 0 ? (
              <p className="empty-state">ไม่มีข้อมูล</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>วัสดุ</th>
                    <th>เบิกแล้ว</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.topIssuedMaterialsThisWeek.map((m) => (
                    <tr key={m.materialId}>
                      <td>{m.materialName ?? m.materialId}</td>
                      <td>{m.issuedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              วัสดุที่เบิกมากที่สุด (เดือนนี้)
            </div>
            {dashboard.topIssuedMaterialsThisMonth.length === 0 ? (
              <p className="empty-state">ไม่มีข้อมูล</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>วัสดุ</th>
                    <th>เบิกแล้ว</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.topIssuedMaterialsThisMonth.map((m) => (
                    <tr key={m.materialId}>
                      <td>{m.materialName ?? m.materialId}</td>
                      <td>{m.issuedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bento-card">
            <div className="stat-label" style={{ marginBottom: "0.6rem" }}>
              รายละเอียดไซต์ที่ยังไม่จบโครงการ
            </div>
            <SiteDetailTable sites={dashboard.activeProjectValueBreakdown.sites} />
          </div>
        </div>
      </div>
    </div>
  );
}
