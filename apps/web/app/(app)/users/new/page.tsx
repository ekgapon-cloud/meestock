import Link from "next/link";
import { createUserAction } from "./actions";

const ROLES = ["REQUESTER", "APPROVER", "WAREHOUSE", "EXECUTIVE", "PURCHASING"] as const;
const ACCESS_LEVELS = ["STAFF", "MANAGER", "ADMIN"] as const;

export default function NewUserPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div>
      <h1>เพิ่มผู้ใช้งาน</h1>
      <form action={createUserAction} className="form-page">
        {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

        <label>
          ชื่อ
          <input type="text" name="name" required />
        </label>

        <label>
          อีเมล
          <input type="email" name="email" required />
        </label>

        <label>
          รหัสผ่าน
          <input type="password" name="password" minLength={8} required />
          <span className="hint">อย่างน้อย 8 ตัวอักษร</span>
        </label>

        <label>
          Role
          <select name="role" required defaultValue="">
            <option value="" disabled>
              เลือก role
            </option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label>
          Access Level
          <select name="accessLevel" defaultValue="STAFF">
            {ACCESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <div className="form-actions">
          <button type="submit">สร้างผู้ใช้งาน</button>
          <Link href="/users">ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}
