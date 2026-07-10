import Link from "next/link";
import type { StockCount } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { DownloadPdfButton } from "../../DownloadPdfButton";
import { Logo } from "../../../../components/Logo";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default async function StockCountDetailPage({ params }: { params: { id: string } }) {
  let count: StockCount;
  try {
    count = await apiFetch<StockCount>(`/stock-counts/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 404) return <div className="empty-state">ไม่พบใบนับสต๊อกนี้</div>;
    }
    throw err;
  }

  const variances = count.items.filter((item) => Number(item.actualQty) !== Number(item.systemQty)).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <Logo size={56} />
          <h1>{count.docNo}</h1>
        </div>
        <DownloadPdfButton href={`/api/stock-counts/${count.id}/pdf`} />
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">คลัง</div>
          <div className="stat-value-sm">{count.warehouse.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ผู้บันทึก</div>
          <div className="stat-value-sm">{count.editedBy.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">วันที่</div>
          <div className="stat-value-sm">{formatDateTime(count.date)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">รายการที่มีส่วนต่าง</div>
          <div className="stat-value-sm">{variances} / {count.items.length}</div>
        </div>
      </div>

      <h2>ผลการนับสต๊อก</h2>
      <table>
        <thead>
          <tr>
            <th>วัสดุ</th>
            <th>ยอดในระบบ</th>
            <th>นับได้จริง</th>
            <th>ส่วนต่าง</th>
            <th>เหตุผล</th>
          </tr>
        </thead>
        <tbody>
          {count.items.map((item) => {
            const diff = Number(item.actualQty) - Number(item.systemQty);
            return (
              <tr key={item.id}>
                <td>{item.material.name}</td>
                <td>{item.systemQty}</td>
                <td>{item.actualQty}</td>
                <td>{diff > 0 ? `+${diff}` : diff}</td>
                <td>{item.reason ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="print-hide">
        <Link href="/stock-counts">← กลับไปรายการนับสต๊อก</Link>
      </p>
    </div>
  );
}
