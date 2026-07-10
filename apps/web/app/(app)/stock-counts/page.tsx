import Link from "next/link";
import type { Me, StockCountListResponse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function StockCountsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });

  let data: StockCountListResponse;
  let me: Me;
  try {
    [data, me] = await Promise.all([
      apiFetch<StockCountListResponse>(`/stock-counts?${query.toString()}`),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  const canCreate = me.role === "WAREHOUSE" || me.accessLevel === "ADMIN" || me.accessLevel === "MANAGER";
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <div className="page-header">
        <h1>นับสต๊อก / ปรับยอด</h1>
        {canCreate && (
          <Link href="/stock-counts/new" className="btn-primary">
            + สร้างใบนับสต๊อก
          </Link>
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="empty-state">ไม่พบใบนับสต๊อก</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>คลัง</th>
              <th>จำนวนรายการ</th>
              <th>ผู้บันทึก</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((sc) => (
              <tr key={sc.id}>
                <td>
                  <Link href={`/stock-counts/${sc.id}`}>{sc.docNo}</Link>
                </td>
                <td>{formatDate(sc.date)}</td>
                <td>{sc.warehouse.name}</td>
                <td>{sc.items.length}</td>
                <td>{sc.editedBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/stock-counts?page=${page - 1}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/stock-counts?page=${page + 1}`}>ถัดไป</Link>}
      </div>
    </div>
  );
}
