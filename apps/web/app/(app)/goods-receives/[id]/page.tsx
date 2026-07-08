import Link from "next/link";
import { redirect } from "next/navigation";
import type { GoodsReceive } from "shared-types";
import { apiFetch, ApiError } from "../../../../lib/api";
import { Logo } from "../../../../components/Logo";
import { PrintButton } from "../../PrintButton";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}

export default async function GoodsReceiveDetailPage({ params }: { params: { id: string } }) {
  let goodsReceive: GoodsReceive;
  try {
    goodsReceive = await apiFetch<GoodsReceive>(`/goods-receives/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 404) return <div className="empty-state">ไม่พบรายการรับวัสดุนี้</div>;
    }
    throw err;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <Logo size={56} />
          <h1>{goodsReceive.docNo}</h1>
        </div>
        <PrintButton />
      </div>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">ไซต์งาน</div>
          <div className="stat-value-sm">{goodsReceive.warehouse.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ผู้ขาย</div>
          <div className="stat-value-sm">{goodsReceive.supplier?.name ?? "-"}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ใบสั่งซื้ออ้างอิง</div>
          <div className="stat-value-sm">
            {goodsReceive.purchaseOrder ? (
              <Link href={`/purchase-orders/${goodsReceive.purchaseOrder.id}`}>
                {goodsReceive.purchaseOrder.docNo}
              </Link>
            ) : (
              "ไม่มี"
            )}
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ผู้บันทึก</div>
          <div className="stat-value-sm">{goodsReceive.createdBy.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">วันที่</div>
          <div className="stat-value-sm">{formatDateTime(goodsReceive.date)}</div>
        </div>
      </div>

      <h2>รายการวัสดุที่รับ</h2>
      <table>
        <thead>
          <tr>
            <th>วัสดุ</th>
            <th>จำนวน</th>
            <th>ต้นทุน/หน่วย</th>
          </tr>
        </thead>
        <tbody>
          {goodsReceive.items.map((item) => (
            <tr key={item.id}>
              <td>{item.material.name}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="print-hide">
        <Link href="/goods-receives">← กลับไปรายการรับวัสดุ</Link>
      </p>
    </div>
  );
}
