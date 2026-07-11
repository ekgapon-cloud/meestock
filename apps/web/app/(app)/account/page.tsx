import type { Me } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";
import { changePasswordAction } from "./actions";

export default async function AccountPage({ searchParams }: { searchParams: { error?: string; success?: string } }) {
  let me: Me;
  try {
    me = await apiFetch<Me>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

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
