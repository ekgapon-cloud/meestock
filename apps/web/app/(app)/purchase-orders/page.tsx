import Link from "next/link";
import { redirect } from "next/navigation";
import type { Me, POStatus, PurchaseOrderListResponse } from "shared-types";
import { apiFetch, ApiError } from "../../../lib/api";

const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: "ร่าง",
  ORDERED: "สั่งซื้อแล้ว",
  PARTIALLY_RECEIVED: "รับบางส่วน",
  RECEIVED: "รับครบแล้ว",
  CANCELLED: "ยกเลิก",
};

const TABS: { label: string; status?: POStatus }[] = [
  { label: "ทั้งหมด" },
  { label: "ร่าง", status: "DRAFT" },
  { label: "สั่งซื้อแล้ว", status: "ORDERED" },
  { label: "รับบางส่วน", status: "PARTIALLY_RECEIVED" },
  { label: "รับครบแล้ว", status: "RECEIVED" },
  { label: "ยกเลิก", status: "CANCELLED" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (searchParams.status) {
    query.set("status", searchParams.status);
  }

  let data: PurchaseOrderListResponse;
  let me: Me;
  try {
    [data, me] = await Promise.all([
      apiFetch<PurchaseOrderListResponse>(`/purchase-orders?${query.toString()}`),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/login");
    }
    throw err;
  }

  const canCreate = me.role === "PURCHASING" || me.accessLevel === "ADMIN";
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const suffix = searchParams.status ? `&status=${searchParams.status}` : "";

  return (
    <div>
      <div className="page-header">
        <h1>ใบสั่งซื้อ</h1>
        {canCreate && (
          <Link href="/purchase-orders/new" className="btn-primary">
            + สร้างใบสั่งซื้อ
          </Link>
        )}
      </div>

      <nav className="tabs">
        {TABS.map((tab) => {
          const href = tab.status ? `/purchase-orders?status=${tab.status}` : "/purchase-orders";
          const active = (searchParams.status ?? "") === (tab.status ?? "");
          return (
            <Link key={tab.label} href={href} className={active ? "tab tab-active" : "tab"}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {data.items.length === 0 ? (
        <p className="empty-state">ไม่พบใบสั่งซื้อ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ผู้ขาย</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((po) => (
              <tr key={po.id}>
                <td>
                  <Link href={`/purchase-orders/${po.id}`}>{po.docNo}</Link>
                </td>
                <td>{formatDate(po.date)}</td>
                <td>{po.supplier.name}</td>
                <td>
                  <span className={`status-badge status-${po.status.toLowerCase()}`}>
                    {STATUS_LABELS[po.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/purchase-orders?page=${page - 1}${suffix}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/purchase-orders?page=${page + 1}${suffix}`}>ถัดไป</Link>}
      </div>
    </div>
  );
}
