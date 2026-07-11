import Link from "next/link";
import type { AdminUserListResponse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { search?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (searchParams.search) {
    query.set("search", searchParams.search);
  }

  let data: AdminUserListResponse;
  try {
    data = await apiFetch<AdminUserListResponse>(`/users?${query.toString()}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 403) {
        return <div className="empty-state">บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องเป็น accessLevel ADMIN)</div>;
      }
    }
    throw err;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const suffix = searchParams.search ? `&search=${encodeURIComponent(searchParams.search)}` : "";

  return (
    <div>
      <div className="page-header">
        <h1>ผู้ใช้งาน</h1>
        <div className="page-header-actions">
          <Link href="/users/login-events" className="btn-secondary">
            ประวัติการเข้าสู่ระบบ
          </Link>
          <Link href="/users/new" className="btn-primary">
            + เพิ่มผู้ใช้งาน
          </Link>
        </div>
      </div>

      <form className="search-form" action="/users">
        <input type="search" name="search" placeholder="ค้นหาชื่อ/อีเมล" defaultValue={searchParams.search ?? ""} />
        <button type="submit">ค้นหา</button>
      </form>

      {data.items.length === 0 ? (
        <p className="empty-state">ไม่พบผู้ใช้งาน</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>Role</th>
              <th>Access Level</th>
              <th>สถานะ</th>
              <th>สร้างเมื่อ</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((user) => (
              <tr key={user.id}>
                <td>
                  <Link href={`/users/${user.id}`}>{user.name}</Link>
                </td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.accessLevel}</td>
                <td>{user.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</td>
                <td>{formatDate(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/users?page=${page - 1}${suffix}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/users?page=${page + 1}${suffix}`}>ถัดไป</Link>}
      </div>
    </div>
  );
}
