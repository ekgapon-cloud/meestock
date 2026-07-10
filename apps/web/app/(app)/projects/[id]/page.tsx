import Link from "next/link";
import type { Me, ProjectDetail, ProjectStatus } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { setProjectStatusAction } from "../actions";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "วางแผน",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

interface StatusAction {
  status: ProjectStatus;
  label: string;
  danger?: boolean;
  /** Locking transitions go through a confirmation step to guard against a misclick. */
  confirm?: boolean;
  /** Reopening a closed project is an ADMIN-only correction. */
  adminOnly?: boolean;
}

// Mirrors the backend ALLOWED_TRANSITIONS; the backend remains the source of truth.
const NEXT_ACTIONS: Record<ProjectStatus, StatusAction[]> = {
  PLANNING: [
    { status: "IN_PROGRESS", label: "เริ่มดำเนินการ" },
    { status: "CANCELLED", label: "ยกเลิกโครงการ", danger: true, confirm: true },
  ],
  IN_PROGRESS: [
    { status: "COMPLETED", label: "ปิดโครงการ (เสร็จสิ้น)", confirm: true },
    { status: "CANCELLED", label: "ยกเลิกโครงการ", danger: true, confirm: true },
  ],
  COMPLETED: [{ status: "IN_PROGRESS", label: "เปิดโครงการกลับ", adminOnly: true }],
  CANCELLED: [{ status: "IN_PROGRESS", label: "เปิดโครงการกลับ", adminOnly: true }],
};

const CONFIRM_TEXT: Partial<Record<ProjectStatus, string>> = {
  COMPLETED: "ยืนยันปิดโครงการนี้? หลังปิดจะสร้างคำขอเบิกวัสดุใหม่เข้าไซต์นี้ไม่ได้ (ADMIN เปิดกลับได้ภายหลัง)",
  CANCELLED: "ยืนยันยกเลิกโครงการนี้? หลังยกเลิกจะสร้างคำขอเบิกวัสดุใหม่เข้าไซต์นี้ไม่ได้ (ADMIN เปิดกลับได้ภายหลัง)",
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
  searchParams: { error?: string; confirm?: string };
}) {
  let project: ProjectDetail;
  let me: Me;
  try {
    [project, me] = await Promise.all([
      apiFetch<ProjectDetail>(`/projects/${params.id}`),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 404) return <div className="empty-state">ไม่พบโครงการนี้</div>;
      if (err.status === 403) return <div className="empty-state">ไม่มีสิทธิ์เข้าถึงโครงการ</div>;
    }
    throw err;
  }

  const isAdmin = me.accessLevel === "ADMIN";
  const actions = NEXT_ACTIONS[project.status].filter((a) => !a.adminOnly || isAdmin);
  const closed = project.status === "COMPLETED" || project.status === "CANCELLED";

  // A pending confirmation: only honor it if it's a real, confirm-required action for this status.
  const pendingConfirm = actions.find((a) => a.confirm && a.status === searchParams.confirm);

  return (
    <div>
      <div className="page-header">
        <h1>
          {project.code} — {project.name}
        </h1>
        <span className={`badge badge-project-${project.status.toLowerCase()}`}>{STATUS_LABEL[project.status]}</span>
      </div>

      {searchParams.error && <div className="error-banner">{searchParams.error}</div>}
      {closed && <p className="hint">โครงการนี้ปิดแล้ว — สร้างคำขอเบิกวัสดุใหม่เข้าไซต์นี้ไม่ได้{isAdmin ? " (กด “เปิดโครงการกลับ” เพื่อแก้ไข)" : ""}</p>}

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

      {pendingConfirm ? (
        <div className="confirm-panel">
          <p className="confirm-warning">⚠️ {CONFIRM_TEXT[pendingConfirm.status] ?? "ยืนยันการเปลี่ยนสถานะ?"}</p>
          <div className="form-actions">
            <form action={setProjectStatusAction.bind(null, project.id, pendingConfirm.status)}>
              <button type="submit" className={pendingConfirm.danger ? "btn-danger" : "btn-primary"}>
                ยืนยัน — {pendingConfirm.label}
              </button>
            </form>
            <Link href={`/projects/${project.id}`}>ยกเลิก ไม่ทำรายการ</Link>
          </div>
        </div>
      ) : (
        actions.length > 0 && (
          <div className="form-actions">
            {actions.map((action) =>
              action.confirm ? (
                // Two-step: go to a confirmation view first (guards against a misclick).
                <Link
                  key={action.status}
                  href={`/projects/${project.id}?confirm=${action.status}`}
                  className={action.danger ? "btn-danger" : "btn-primary"}
                >
                  {action.label}
                </Link>
              ) : (
                <form key={action.status} action={setProjectStatusAction.bind(null, project.id, action.status)}>
                  <button type="submit" className={action.danger ? "btn-danger" : "btn-primary"}>
                    {action.label}
                  </button>
                </form>
              ),
            )}
          </div>
        )
      )}

      <p className="print-hide">
        <Link href="/projects">← กลับไปรายการโครงการ</Link>
      </p>
    </div>
  );
}
