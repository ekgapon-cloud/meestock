import Link from "next/link";
import type { Me, StockTransferListResponse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function StockTransfersPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });

  let data: StockTransferListResponse;
  let me: Me;
  try {
    [data, me] = await Promise.all([
      apiFetch<StockTransferListResponse>(`/stock-transfers?${query.toString()}`),
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
        <h1>โอนย้ายวัสดุระหว่างคลัง</h1>
        {canCreate && (
          <Link href="/stock-transfers/new" className="btn-primary">
            + สร้างใบโอนย้าย
          </Link>
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="empty-state">ไม่พบรายการโอนย้าย</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>จากคลัง</th>
              <th>ไปคลัง</th>
              <th>ผู้บันทึก</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((tr) => (
              <tr key={tr.id}>
                <td>
                  <Link href={`/stock-transfers/${tr.id}`}>{tr.docNo}</Link>
                </td>
                <td>{formatDate(tr.date)}</td>
                <td>{tr.fromWarehouse.name}</td>
                <td>{tr.toWarehouse.name}</td>
                <td>{tr.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/stock-transfers?page=${page - 1}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/stock-transfers?page=${page + 1}`}>ถัดไป</Link>}
      </div>
    </div>
  );
}
