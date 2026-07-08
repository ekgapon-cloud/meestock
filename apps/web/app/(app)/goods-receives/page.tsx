import Link from "next/link";
import type { GoodsReceiveListResponse, Me } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function GoodsReceivesPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });

  let data: GoodsReceiveListResponse;
  let me: Me;
  try {
    [data, me] = await Promise.all([
      apiFetch<GoodsReceiveListResponse>(`/goods-receives?${query.toString()}`),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  const canCreate = me.role === "WAREHOUSE" || me.accessLevel === "ADMIN";
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <div className="page-header">
        <h1>รับวัสดุเข้าคลัง</h1>
        {canCreate && (
          <Link href="/goods-receives/new" className="btn-primary">
            + รับวัสดุ
          </Link>
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="empty-state">ไม่พบรายการรับวัสดุ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>ไซต์งาน</th>
              <th>ผู้ขาย</th>
              <th>ใบสั่งซื้ออ้างอิง</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((gr) => (
              <tr key={gr.id}>
                <td>
                  <Link href={`/goods-receives/${gr.id}`}>{gr.docNo}</Link>
                </td>
                <td>{formatDate(gr.date)}</td>
                <td>{gr.warehouse.name}</td>
                <td>{gr.supplier?.name ?? "-"}</td>
                <td>
                  {gr.purchaseOrder ? (
                    <Link href={`/purchase-orders/${gr.purchaseOrder.id}`}>{gr.purchaseOrder.docNo}</Link>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/goods-receives?page=${page - 1}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/goods-receives?page=${page + 1}`}>ถัดไป</Link>}
      </div>
    </div>
  );
}
