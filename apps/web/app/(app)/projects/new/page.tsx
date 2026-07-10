import Link from "next/link";
import type { Customer } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { createProjectAction } from "../actions";

export default async function NewProjectPage({ searchParams }: { searchParams: { error?: string } }) {
  let customers: Customer[];
  try {
    customers = await apiFetch<Customer[]>("/projects/customers");
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 403) return <div className="empty-state">ไม่มีสิทธิ์สร้างโครงการ</div>;
    }
    throw err;
  }

  return (
    <div>
      <h1>สร้างโครงการใหม่</h1>
      <form action={createProjectAction} className="form-page form-page-wide">
        {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

        <label>
          รหัสโครงการ
          <input type="text" name="code" required placeholder="เช่น PRJ-2026-001" />
        </label>

        <label>
          ชื่อโครงการ
          <input type="text" name="name" required />
        </label>

        <label>
          ลูกค้า
          <select name="customerChoice" required defaultValue="">
            <option value="" disabled>
              เลือกลูกค้า
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
            <option value="__new__">+ สร้างลูกค้าใหม่</option>
          </select>
          <span className="hint">กรอก 2 ช่องด้านล่างเฉพาะเมื่อเลือก “+ สร้างลูกค้าใหม่”</span>
        </label>

        <label>
          ชื่อลูกค้าใหม่
          <input type="text" name="newCustomerName" />
        </label>
        <label>
          ผู้ติดต่อลูกค้าใหม่
          <input type="text" name="newCustomerContact" />
        </label>

        <label>
          วันที่เริ่ม
          <input type="date" name="startDate" required />
        </label>
        <label>
          วันที่สิ้นสุด (ถ้ามี)
          <input type="date" name="endDate" />
        </label>

        <label>
          มูลค่าสัญญา (บาท)
          <input type="number" name="contractValue" min="0" step="0.01" defaultValue="0" required />
        </label>

        <label>
          ชื่อคลังไซต์ (เว้นว่าง = ใช้ชื่อโครงการ)
          <input type="text" name="warehouseName" placeholder="ระบบจะสร้างคลัง SITE ให้อัตโนมัติ" />
        </label>

        <div className="form-actions">
          <button type="submit">สร้างโครงการ</button>
          <Link href="/projects">ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}
