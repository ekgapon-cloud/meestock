import Link from "next/link";
import type { LoginEventListResponse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

/** Condense a raw User-Agent string to a human-friendly device/browser hint. */
function describeDevice(ua: string | null): string {
  if (!ua) return "-";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad|iOS/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return [os, browser].filter(Boolean).join(" · ") || "อื่นๆ";
}

export default async function LoginEventsPage({
  searchParams,
}: {
  searchParams: { search?: string; success?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "50" });
  if (searchParams.search) query.set("search", searchParams.search);
  if (searchParams.success === "true" || searchParams.success === "false") {
    query.set("success", searchParams.success);
  }

  let data: LoginEventListResponse;
  try {
    data = await apiFetch<LoginEventListResponse>(`/users/login-events?${query.toString()}`);
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
  const carry = new URLSearchParams();
  if (searchParams.search) carry.set("search", searchParams.search);
  if (searchParams.success) carry.set("success", searchParams.success);
  const pageLink = (target: number) => {
    const q = new URLSearchParams(carry);
    q.set("page", String(target));
    return `/users/login-events?${q.toString()}`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>ประวัติการเข้าสู่ระบบ</h1>
        <Link href="/users">← กลับไปผู้ใช้งาน</Link>
      </div>

      <form className="search-form" action="/users/login-events">
        <input type="search" name="search" placeholder="ค้นหาชื่อ/อีเมล" defaultValue={searchParams.search ?? ""} />
        <select name="success" defaultValue={searchParams.success ?? ""}>
          <option value="">ทั้งหมด</option>
          <option value="true">สำเร็จ</option>
          <option value="false">ล้มเหลว</option>
        </select>
        <button type="submit">ค้นหา</button>
      </form>

      {data.items.length === 0 ? (
        <p className="empty-state">ยังไม่มีประวัติการเข้าสู่ระบบ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เวลา</th>
              <th>ผู้ใช้</th>
              <th>อีเมล</th>
              <th>ผล</th>
              <th>IP</th>
              <th>อุปกรณ์</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((event) => (
              <tr key={event.id}>
                <td>{formatDateTime(event.createdAt)}</td>
                <td>{event.employee?.name ?? <span className="hint">ไม่พบบัญชี</span>}</td>
                <td>{event.email}</td>
                <td>
                  <span className={`status-badge status-${event.success ? "received" : "cancelled"}`}>
                    {event.success ? "สำเร็จ" : "ล้มเหลว"}
                  </span>
                </td>
                <td>{event.ipAddress ?? "-"}</td>
                <td>{describeDevice(event.userAgent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={pageLink(page - 1)}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages} ({data.total} รายการ)
        </span>
        {page < totalPages && <Link href={pageLink(page + 1)}>ถัดไป</Link>}
      </div>
    </div>
  );
}
