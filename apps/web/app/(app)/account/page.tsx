import type { Me } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";
import { changePasswordAction } from "./actions";

type ManualKey = "requester" | "approver" | "warehouse" | "purchasing" | "executive" | "admin" | "full";

const MANUALS: { key: ManualKey; label: string }[] = [
  { key: "full", label: "คู่มือฉบับเต็ม (ทุกบทบาท)" },
  { key: "requester", label: "ผู้ขอเบิกวัสดุ" },
  { key: "approver", label: "ผู้อนุมัติ" },
  { key: "warehouse", label: "เจ้าหน้าที่คลัง" },
  { key: "purchasing", label: "ฝ่ายจัดซื้อ" },
  { key: "executive", label: "ผู้บริหาร / ผู้จัดการ" },
  { key: "admin", label: "ผู้ดูแลระบบ" },
];

// which manual best matches this user's access level + role
function recommendedManual(me: Me): ManualKey {
  if (me.accessLevel === "ADMIN") return "admin";
  if (me.accessLevel === "MANAGER") return "executive";
  switch (me.role) {
    case "REQUESTER":
      return "requester";
    case "APPROVER":
      return "approver";
    case "WAREHOUSE":
      return "warehouse";
    case "PURCHASING":
      return "purchasing";
    default:
      return "full";
  }
}

const manualHref = (key: ManualKey) => `/manuals/meestock-manual-${key}.doc`;

export default async function AccountPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  let me: Me;
  try {
    me = await apiFetch<Me>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  const recommended = recommendedManual(me);
  const recommendedLabel = MANUALS.find((m) => m.key === recommended)?.label ?? "";

  return (
    <div>
      <h1>บัญชีของฉัน</h1>

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">ชื่อ</div>
          <div className="stat-value-sm">{me.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">อีเมล</div>
          <div className="stat-value-sm">{me.email}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Role</div>
          <div className="stat-value-sm">{me.role}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Access Level</div>
          <div className="stat-value-sm">{me.accessLevel}</div>
        </div>
      </div>

      <h2>คู่มือการใช้งาน</h2>
      <p className="manual-hint">ดาวน์โหลดคู่มือเป็นไฟล์เอกสาร (.doc) เปิดอ่าน/พิมพ์ได้ในโปรแกรม Word</p>
      <div className="manual-download">
        <a href={manualHref(recommended)} download className="btn-primary">
          ⬇️ ดาวน์โหลดคู่มือของฉัน — {recommendedLabel}
        </a>
      </div>
      <details className="manual-more">
        <summary>ดาวน์โหลดคู่มือบทบาทอื่น</summary>
        <ul className="manual-list">
          {MANUALS.map((m) => (
            <li key={m.key}>
              <a href={manualHref(m.key)} download>
                {m.label}
                {m.key === recommended ? " (ของคุณ)" : ""}
              </a>
            </li>
          ))}
        </ul>
      </details>

      <h2>เปลี่ยนรหัสผ่าน</h2>
      {searchParams.error && <div className="error-banner">{searchParams.error}</div>}
      {searchParams.success && <div className="success-banner">เปลี่ยนรหัสผ่านเรียบร้อยแล้ว</div>}

      <form action={changePasswordAction} className="form-page">
        <label>
          รหัสผ่านปัจจุบัน
          <input type="password" name="currentPassword" required autoComplete="current-password" />
        </label>
        <label>
          รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
          <input type="password" name="newPassword" minLength={8} required autoComplete="new-password" />
        </label>
        <label>
          ยืนยันรหัสผ่านใหม่
          <input type="password" name="confirmPassword" minLength={8} required autoComplete="new-password" />
        </label>
        <div className="form-actions">
          <button type="submit">เปลี่ยนรหัสผ่าน</button>
        </div>
      </form>
    </div>
  );
}
