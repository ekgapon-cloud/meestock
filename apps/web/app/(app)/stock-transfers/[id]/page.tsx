import Link from "next/link";
import type { StockTransfer } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { DownloadPdfButton } from "../../DownloadPdfButton";
import { Logo } from "../../../../components/Logo";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}

export default async function StockTransferDetailPage({ params }: { params: { id: string } }) {
  let transfer: StockTransfer;
  try {
    transfer = await apiFetch<StockTransfer>(`/stock-transfers/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 404) return <div className="empty-state">ไม่พบใบโอนย้ายนี้</div>;
    }
    throw err;
  }

  // unitCost is present only when the viewer may see cost (API redacts it to null for STAFF).
  const showCost = transfer.items.some((item) => item.unitCost != null);
  const totalValue = transfer.items.reduce((sum, item) => sum + Number(item.unitCost ?? 0) * Number(item.quantity), 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <Logo size={56} />
          <h1>{transfer.docNo}</h1>
        </div>
        <DownloadPdfButton href={`/api/stock-transfers/${transfer.id}/pdf`} />
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">จากคลัง (ต้นทาง)</div>
          <div className="stat-value-sm">{transfer.fromWarehouse.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ไปคลัง (ปลายทาง)</div>
          <div className="stat-value-sm">{transfer.toWarehouse.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ผู้บันทึก</div>
          <div className="stat-value-sm">{transfer.createdBy.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">วันที่</div>
          <div className="stat-value-sm">{formatDateTime(transfer.date)}</div>
        </div>
      </div>

      <h2>รายการวัสดุที่โอน</h2>
      <table>
        <thead>
          <tr>
            <th>วัสดุ</th>
            <th>จำนวน</th>
            {showCost && <th>ต้นทุน/หน่วย</th>}
            {showCost && <th>มูลค่ารวม</th>}
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item) => (
            <tr key={item.id}>
              <td>{item.material.name}</td>
              <td>{item.quantity}</td>
              {showCost && <td>{item.unitCost != null ? formatCurrency(item.unitCost) : "-"}</td>}
              {showCost && (
                <td>{item.unitCost != null ? formatCurrency(Number(item.unitCost) * Number(item.quantity)) : "-"}</td>
              )}
            </tr>
          ))}
        </tbody>
        {showCost && (
          <tfoot>
            <tr>
              <td colSpan={3}>รวมมูลค่าที่โอน</td>
              <td>{formatCurrency(totalValue)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      <p className="print-hide">
        <Link href="/stock-transfers">← กลับไปรายการโอนย้าย</Link>
      </p>
    </div>
  );
}
