import Link from "next/link";
import { redirect } from "next/navigation";
import type { AdminUser, Me, Warehouse } from "shared-types";
import { apiFetch, ApiError } from "../../../../lib/api";
import { assignSiteAccessAction, revokeSiteAccessAction, updateUserAction } from "./actions";

const ROLES = ["REQUESTER", "APPROVER", "WAREHOUSE", "EXECUTIVE", "PURCHASING"] as const;
const ACCESS_LEVELS = ["STAFF", "MANAGER", "ADMIN"] as const;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  let user: AdminUser;
  let me: Me;
  let warehouses: Warehouse[];
  try {
    [user, me, warehouses] = await Promise.all([
      apiFetch<AdminUser>(`/users/${params.id}`),
      apiFetch<Me>("/auth/me"),
      apiFetch<Warehouse[]>("/warehouses"),
    ]);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirect("/login");
      if (err.status === 403) {
        return <div className="empty-state">บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้านี้ (ต้องเป็น accessLevel ADMIN)</div>;
      }
      if (err.status === 404) return <div className="empty-state">ไม่พบผู้ใช้งานนี้</div>;
    }
    throw err;
  }

  const isSelf = me.id === user.id;
  const assignedWarehouseIds = new Set(user.siteAccess.map((entry) => entry.warehouseId));
  const availableWarehouses = warehouses.filter((w) => !assignedWarehouseIds.has(w.id));

  return (
    <div>
      <h1>{user.name}</h1>

      {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

      <form action={updateUserAction.bind(null, user.id)} className="form-page">
        <label>
          ชื่อ
          <input type="text" name="name" defaultValue={user.name} required />
        </label>

        <label>
          อีเมล
          <input type="email" name="email" defaultValue={user.email} required />
        </label>

        <label>
          Role
          <select name="role" defaultValue={user.role} required>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label>
          Access Level
          <select name="accessLevel" defaultValue={user.accessLevel} disabled={isSelf} required>
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          {isSelf && <span className="hint">ไม่สามารถแก้ไข access level ของตัวเองได้</span>}
        </label>

        <label className="checkbox-label">
          {!isSelf && <input type="hidden" name="isActivePresent" value="1" />}
          <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={isSelf} />
          ใช้งานอยู่
          {isSelf && <span className="hint">ไม่สามารถปิดใช้งานบัญชีตัวเองได้</span>}
        </label>

        <div className="form-actions">
          <button type="submit">บันทึก</button>
        </div>
      </form>

      <h2>สิทธิ์เข้าถึงไซต์งาน</h2>
      {user.siteAccess.length === 0 ? (
        <p className="empty-state">ยังไม่มีสิทธิ์เข้าถึงไซต์งานใด</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ไซต์งาน</th>
              <th>ให้สิทธิ์เมื่อ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {user.siteAccess.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.warehouse.name}</td>
                <td>{formatDateTime(entry.createdAt)}</td>
                <td>
                  <form action={revokeSiteAccessAction.bind(null, user.id, entry.warehouseId)}>
                    <button type="submit" className="btn-danger-sm">
                      เพิกถอน
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {availableWarehouses.length > 0 && (
        <form action={assignSiteAccessAction.bind(null, user.id)} className="manual-add-row">
          <select name="warehouseId" required defaultValue="">
            <option value="" disabled>
              เลือกไซต์งานที่จะให้สิทธิ์
            </option>
            {availableWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
          <button type="submit">+ ให้สิทธิ์</button>
        </form>
      )}

      <p>
        <Link href="/users">← กลับไปรายการผู้ใช้งาน</Link>
      </p>
    </div>
  );
}
