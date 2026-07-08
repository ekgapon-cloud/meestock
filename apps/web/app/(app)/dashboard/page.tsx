import { redirect } from "next/navigation";
import type { ExecutiveDashboard } from "shared-types";
import { apiFetch, ApiError } from "../../../lib/api";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

export default async function DashboardPage() {
  let dashboard: ExecutiveDashboard;
  try {
    dashboard = await apiFetch<ExecutiveDashboard>("/dashboard/executive");
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        redirect("/login");
      }
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
      <h1>Executive dashboard</h1>

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
              {dashboard.topIssuedMaterials.map((m) => (
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
