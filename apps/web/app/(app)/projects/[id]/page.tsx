import Link from "next/link";
import type { ProjectDetail, ProjectStatus } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { setProjectStatusAction } from "../actions";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "วางแผน",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

// Mirrors the backend ALLOWED_TRANSITIONS; the backend remains the source of truth.
const NEXT_ACTIONS: Record<ProjectStatus, { status: ProjectStatus; label: string; danger?: boolean }[]> = {
  PLANNING: [
    { status: "IN_PROGRESS", label: "เริ่มดำเนินการ" },
    { status: "CANCELLED", label: "ยกเลิกโครงการ", danger: true },
  ],
  IN_PROGRESS: [
    { status: "COMPLETED", label: "ปิดโครงการ (เสร็จสิ้น)" },
    { status: "CANCELLED", label: "ยกเลิกโครงการ", danger: true },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("th-TH", { dateStyle: "medium" }) : "-";
}

function formatCurrency(value: string | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  let project: ProjectDetail;
  try {
    project = await apiFetch<ProjectDetail>(`/projects/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 404) return <div className="empty-state">ไม่พบโครงการนี้</div>;
      if (err.status === 403) return <div className="empty-state">ไม่มีสิทธิ์เข้าถึงโครงการ</div>;
    }
    throw err;
  }

  const actions = NEXT_ACTIONS[project.status];
  const closed = project.status === "COMPLETED" || project.status === "CANCELLED";

  return (
    <div>
      <div className="page-header">
        <h1>
          {project.code} — {project.name}
        </h1>
        <span className={`badge badge-project-${project.status.toLowerCase()}`}>{STATUS_LABEL[project.status]}</span>
      </div>

      {searchParams.error && <div className="error-banner">{searchParams.error}</div>}
      {closed && <p className="hint">โครงการนี้ปิดแล้ว — ไม่สามารถสร้างคำขอเบิกวัสดุใหม่เข้าไซต์นี้ได้</p>}

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">ลูกค้า</div>
          <div className="stat-value-sm">{project.customer.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">มูลค่าสัญญา</div>
          <div className="stat-value-sm">{formatCurrency(project.contractValue)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">เริ่ม</div>
          <div className="stat-value-sm">{formatDate(project.startDate)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">สิ้นสุด</div>
          <div className="stat-value-sm">{formatDate(project.endDate)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">งบวัสดุ</div>
          <div className="stat-value-sm">{formatCurrency(project.materialBudget)}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">งบค่าแรง</div>
          <div className="stat-value-sm">{formatCurrency(project.laborBudget)}</div>
        </div>
      </div>

      <h2>คลังของโครงการ</h2>
      {project.warehouses.length === 0 ? (
        <p className="empty-state">ยังไม่มีคลังผูกกับโครงการนี้</p>
      ) : (
        <ul>
          {project.warehouses.map((warehouse) => (
            <li key={warehouse.id}>
              {warehouse.name} ({warehouse.type})
            </li>
          ))}
        </ul>
      )}

      {actions.length > 0 && (
        <div className="form-actions">
          {actions.map((action) => (
            <form key={action.status} action={setProjectStatusAction.bind(null, project.id, action.status)}>
              <button type="submit" className={action.danger ? "btn-danger" : "btn-primary"}>
                {action.label}
              </button>
            </form>
          ))}
        </div>
      )}

      <p className="print-hide">
        <Link href="/projects">← กลับไปรายการโครงการ</Link>
      </p>
    </div>
  );
}
