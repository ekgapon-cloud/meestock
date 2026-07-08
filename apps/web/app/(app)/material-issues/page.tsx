import Link from "next/link";
import { redirect } from "next/navigation";
import type { IssueStatus, MaterialIssueListResponse, Me } from "shared-types";
import { apiFetch, ApiError } from "../../../lib/api";

const STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  PARTIALLY_FULFILLED: "จ่ายบางส่วน",
  FULFILLED: "จ่ายครบแล้ว",
};

const TABS: { label: string; status?: IssueStatus }[] = [
  { label: "ทั้งหมด" },
  { label: "รออนุมัติ", status: "PENDING_APPROVAL" },
  { label: "อนุมัติแล้ว", status: "APPROVED" },
  { label: "จ่ายบางส่วน", status: "PARTIALLY_FULFILLED" },
  { label: "จ่ายครบแล้ว", status: "FULFILLED" },
  { label: "ปฏิเสธ", status: "REJECTED" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default async function MaterialIssuesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (searchParams.status) {
    query.set("status", searchParams.status);
  }

  let data: MaterialIssueListResponse;
  let me: Me;
  try {
    [data, me] = await Promise.all([
      apiFetch<MaterialIssueListResponse>(`/material-issues?${query.toString()}`),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/login");
    }
    throw err;
  }

  const canCreate = me.role === "REQUESTER" || me.accessLevel === "ADMIN";
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const suffix = searchParams.status ? `&status=${searchParams.status}` : "";

  return (
    <div>
      <div className="page-header">
        <h1>คำขอเบิกวัสดุ</h1>
        {canCreate && (
          <Link href="/material-issues/new" className="btn-primary">
            + สร้างคำขอ
          </Link>
        )}
      </div>

      <nav className="tabs">
        {TABS.map((tab) => {
          const href = tab.status ? `/material-issues?status=${tab.status}` : "/material-issues";
          const active = (searchParams.status ?? "") === (tab.status ?? "");
          return (
            <Link key={tab.label} href={href} className={active ? "tab tab-active" : "tab"}>
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {data.items.length === 0 ? (
        <p className="empty-state">ไม่พบคำขอ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th>
              <th>วันที่</th>
              <th>โครงการ</th>
              <th>ผู้ขอเบิก</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((issue) => (
              <tr key={issue.id}>
                <td>
                  <Link href={`/material-issues/${issue.id}`}>{issue.docNo}</Link>
                </td>
                <td>{formatDate(issue.date)}</td>
                <td>{issue.project.name}</td>
                <td>{issue.requester.name}</td>
                <td>
                  <span className={`status-badge status-${issue.status.toLowerCase()}`}>
                    {STATUS_LABELS[issue.status]}
                  </span>
                  {issue.isOverdue && <span className="status-badge status-overdue">เกินกำหนด</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/material-issues?page=${page - 1}${suffix}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/material-issues?page=${page + 1}${suffix}`}>ถัดไป</Link>}
      </div>
    </div>
  );
}
