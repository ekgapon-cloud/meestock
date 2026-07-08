import type { ExecutiveDashboard, IssueStatus, Me, StaffDashboard } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";
import { Logo } from "../../../components/Logo";

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

  return (
    <div>
      <div className="page-header-title" style={{ marginBottom: "1rem" }}>
        <Logo variant="icon" size={44} />
        <h1>Executive dashboard</h1>
      </div>

      <div className="bento-grid">
        <div className="bento-card bento-card-lg">
          <div className="stat-label">มูลค่าสต๊อกรวม</div>
          <div className="stat-value">{formatCurrency(dashboard.totalStockValue)}</div>
          <div className="bento-divider">
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
        </div>

        <div className="bento-card">
          <div className="stat-label">ใบเบิกเดือนล่าสุด</div>
          <div className="stat-value-sm" style={{ fontSize: "1.3rem" }}>
            {latestMonth ? latestMonth.count : "-"}
          </div>
        </div>

        <div className="bento-card">
          <div className="stat-label">ต่ำกว่าจุดสั่งซื้อ</div>
          <div className="stat-value-sm" style={{ fontSize: "1.3rem" }}>
            {dashboard.lowStockMaterials.length} รายการ
          </div>
        </div>

        <div className="bento-card bento-card-wide">
          <div className="stat-label" style={{ marginBottom: "0.5rem" }}>
            วัสดุที่เบิกมากที่สุด
          </div>
          {dashboard.topIssuedMaterials.length === 0 ? (
            <p className="empty-state">ไม่มีข้อมูล</p>
          ) : (
            <div className="bento-list">
              <div className="bento-list-header">
                <span>วัสดุ</span>
                <div className="bento-list-row-values">
                  <span>เบิกแล้ว</span>
                  <span>คงเหลือ</span>
                </div>
              </div>
              {dashboard.topIssuedMaterials.map((m) => (
                <div className="bento-list-row" key={m.materialId}>
                  <span>{m.materialName ?? m.materialId}</span>
                  <div className="bento-list-row-values">
                    <span>{m.issuedQty}</span>
                    <span>{m.remainingQty}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bento-card bento-card-wide">
          <div className="stat-label" style={{ marginBottom: "0.5rem" }}>
            ไซต์ต้นทุนสูงสุด
          </div>
          {dashboard.topCostSites.length === 0 ? (
            <p className="empty-state">ไม่มีข้อมูล</p>
          ) : (
            <div className="bento-list">
              {dashboard.topCostSites.map((s) => (
                <div className="bento-list-row" key={s.warehouseId}>
                  <span>{s.warehouseName ?? s.warehouseId}</span>
                  <span>{formatCurrency(s.cost)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <section>
        <h2>มูลค่าสต๊อกตามไซต์</h2>
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
      </section>

      <section>
        <h2>วัสดุต่ำกว่าจุดสั่งซื้อ</h2>
        {dashboard.lowStockMaterials.length === 0 ? (
          <p className="empty-state">ไม่มีวัสดุต่ำกว่าจุดสั่งซื้อ</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>วัสดุ</th>
                <th>คงเหลือ</th>
                <th>จุดสั่งซื้อ</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.lowStockMaterials.map((m, i) => (
                <tr key={`${m.materialId}-${m.warehouseId}-${i}`}>
                  <td>{m.materialName}</td>
                  <td>{m.balance}</td>
                  <td>{m.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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

  return (
    <div>
      <div className="page-header-title" style={{ marginBottom: "1rem" }}>
        <Logo variant="icon" size={44} />
        <h1>แดชบอร์ด</h1>
      </div>

      <h2>สัปดาห์ที่ผ่านมา</h2>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกวัสดุ</div>
          <div className="stat-value">{dashboard.issuesThisWeek}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบรับวัสดุ</div>
          <div className="stat-value">{dashboard.receivesThisWeek}</div>
        </div>
      </div>

      <h2>เดือนที่ผ่านมา</h2>
      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกวัสดุ</div>
          <div className="stat-value">{dashboard.issuesThisMonth}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบรับวัสดุ</div>
          <div className="stat-value">{dashboard.receivesThisMonth}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ต่ำกว่าจุดสั่งซื้อ</div>
          <div className="stat-value">{dashboard.lowStockCount} รายการ</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบเบิกเกินกำหนด</div>
          <div className="stat-value">{dashboard.overdueIssuesCount} รายการ</div>
        </div>
      </div>

      <div className="bento-grid">
        <div className="bento-card bento-card-wide">
          <div className="stat-label" style={{ marginBottom: "0.5rem" }}>
            สถานะใบเบิกในเดือนนี้
          </div>
          {statusEntries.length === 0 ? (
            <p className="empty-state">ไม่มีข้อมูล</p>
          ) : (
            <div className="bento-list">
              {statusEntries.map(([status, count]) => (
                <div className="bento-list-row" key={status}>
                  <span className={`status-badge status-${status.toLowerCase()}`}>
                    {STATUS_LABELS[status as IssueStatus] ?? status}
                  </span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bento-card bento-card-wide">
          <div className="stat-label" style={{ marginBottom: "0.5rem" }}>
            วัสดุที่เบิกมากที่สุด (สัปดาห์นี้)
          </div>
          {dashboard.topIssuedMaterialsThisWeek.length === 0 ? (
            <p className="empty-state">ไม่มีข้อมูล</p>
          ) : (
            <div className="bento-list">
              {dashboard.topIssuedMaterialsThisWeek.map((m) => (
                <div className="bento-list-row" key={m.materialId}>
                  <span>{m.materialName ?? m.materialId}</span>
                  <span>{m.issuedQty}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bento-card bento-card-wide">
          <div className="stat-label" style={{ marginBottom: "0.5rem" }}>
            วัสดุที่เบิกมากที่สุด (เดือนนี้)
          </div>
          {dashboard.topIssuedMaterialsThisMonth.length === 0 ? (
            <p className="empty-state">ไม่มีข้อมูล</p>
          ) : (
            <div className="bento-list">
              {dashboard.topIssuedMaterialsThisMonth.map((m) => (
                <div className="bento-list-row" key={m.materialId}>
                  <span>{m.materialName ?? m.materialId}</span>
                  <span>{m.issuedQty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <section>
        <h2>วัสดุต่ำกว่าจุดสั่งซื้อ</h2>
        {dashboard.lowStockMaterials.length === 0 ? (
          <p className="empty-state">ไม่มีวัสดุต่ำกว่าจุดสั่งซื้อ</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>วัสดุ</th>
                <th>คงเหลือ</th>
                <th>จุดสั่งซื้อ</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.lowStockMaterials.map((m, i) => (
                <tr key={`${m.materialId}-${m.warehouseId}-${i}`}>
                  <td>{m.materialName}</td>
                  <td>{m.balance}</td>
                  <td>{m.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
