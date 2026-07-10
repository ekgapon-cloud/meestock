import Link from "next/link";
import type { ProjectListResponse, ProjectStatus } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "วางแผน",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}

export default async function ProjectsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams.page ?? "1");
  const query = new URLSearchParams({ page: String(page), limit: "20" });

  let data: ProjectListResponse;
  try {
    data = await apiFetch<ProjectListResponse>(`/projects?${query.toString()}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 403) return <div className="empty-state">เฉพาะผู้จัดการ/ผู้ดูแลระบบเท่านั้นที่เข้าถึงโครงการได้</div>;
    }
    throw err;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div>
      <div className="page-header">
        <h1>โครงการ / ไซต์งาน</h1>
        <Link href="/projects/new" className="btn-primary">
          + สร้างโครงการ
        </Link>
      </div>

      {data.items.length === 0 ? (
        <p className="empty-state">ยังไม่มีโครงการ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อโครงการ</th>
              <th>ลูกค้า</th>
              <th>สถานะ</th>
              <th>เริ่ม</th>
              <th>มูลค่าสัญญา</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((project) => (
              <tr key={project.id}>
                <td>
                  <Link href={`/projects/${project.id}`}>{project.code}</Link>
                </td>
                <td>{project.name}</td>
                <td>{project.customer.name}</td>
                <td>
                  <span className={`badge badge-project-${project.status.toLowerCase()}`}>
                    {STATUS_LABEL[project.status]}
                  </span>
                </td>
                <td>{formatDate(project.startDate)}</td>
                <td>{formatCurrency(project.contractValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={`/projects?page=${page - 1}`}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={`/projects?page=${page + 1}`}>ถัดไป</Link>}
      </div>
    </div>
  );
}
