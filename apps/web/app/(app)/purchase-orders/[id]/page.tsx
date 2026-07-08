import Link from "next/link";
import { redirect } from "next/navigation";
import type { Me, POStatus, PurchaseOrder } from "shared-types";
import { apiFetch, ApiError } from "../../../../lib/api";
import { Logo } from "../../../../components/Logo";
import { DownloadPdfButton } from "../../DownloadPdfButton";
import { cancelPurchaseOrderAction, markPurchaseOrderOrderedAction } from "./actions";

const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: "ร่าง",
  ORDERED: "สั่งซื้อแล้ว",
  PARTIALLY_RECEIVED: "รับบางส่วน",
  RECEIVED: "รับครบแล้ว",
  CANCELLED: "ยกเลิก",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}

export default async function PurchaseOrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  let po: PurchaseOrder;
  let me: Me;
  try {
    [po, me] = await Promise.all([
      apiFetch<PurchaseOrder>(`/purchase-orders/${params.id}`),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 404) return <div className="empty-state">ไม่พบใบสั่งซื้อนี้</div>;
    }
    throw err;
  }

  const canManage = me.role === "PURCHASING" || me.accessLevel === "ADMIN";
  const canMarkOrdered = canManage && po.status === "DRAFT";
  const canCancel = canManage && (po.status === "DRAFT" || po.status === "ORDERED");

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <Logo size={56} />
          <h1>{po.docNo}</h1>
        </div>
        <div className="page-header-actions">
          <span className={`status-badge status-${po.status.toLowerCase()}`}>{STATUS_LABELS[po.status]}</span>
          <DownloadPdfButton href={`/api/purchase-orders/${po.id}/pdf`} />
        </div>
      </div>

      {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">ผู้ขาย</div>
          <div className="stat-value-sm">{po.supplier.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ผู้สร้าง</div>
          <div className="stat-value-sm">{po.createdBy.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">วันที่สร้าง</div>
          <div className="stat-value-sm">{formatDateTime(po.date)}</div>
        </div>
      </div>

      <h2>รายการวัสดุ</h2>
      <table>
        <thead>
          <tr>
            <th>วัสดุ</th>
            <th>สั่งซื้อ</th>
            <th>รับแล้ว</th>
            <th>ต้นทุน/หน่วย</th>
          </tr>
        </thead>
        <tbody>
          {po.items.map((item) => (
            <tr key={item.id}>
              <td>{item.material.name}</td>
              <td>{item.orderedQty}</td>
              <td>{item.receivedQty}</td>
              <td>{formatCurrency(item.unitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(canMarkOrdered || canCancel) && (
        <section className="form-actions">
          {canMarkOrdered && (
            <form action={markPurchaseOrderOrderedAction.bind(null, po.id)}>
              <button type="submit">สั่งซื้อ</button>
            </form>
          )}
          {canCancel && (
            <form action={cancelPurchaseOrderAction.bind(null, po.id)}>
              <button type="submit" className="btn-danger-sm">
                ยกเลิกใบสั่งซื้อ
              </button>
            </form>
          )}
        </section>
      )}

      <p className="print-hide">
        <Link href="/purchase-orders">← กลับไปรายการใบสั่งซื้อ</Link>
      </p>
    </div>
  );
}
