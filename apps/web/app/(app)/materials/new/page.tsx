import Link from "next/link";
import { redirect } from "next/navigation";
import type { Category } from "shared-types";
import { apiFetch, ApiError } from "../../../../lib/api";
import { createMaterialAction } from "./actions";

export default async function NewMaterialPage({ searchParams }: { searchParams: { error?: string } }) {
  let categories: Category[];
  try {
    categories = await apiFetch<Category[]>("/categories");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/api/auth/logout");
    }
    throw err;
  }

  return (
    <div>
      <h1>เพิ่มวัสดุใหม่</h1>
      <form action={createMaterialAction} className="form-page">
        {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

        <label>
          รหัสวัสดุ
          <input type="text" name="code" required />
        </label>

        <label>
          บาร์โค้ด (ถ้ามี)
          <input type="text" name="barcode" />
        </label>

        <label>
          ชื่อวัสดุ
          <input type="text" name="name" required />
        </label>

        <label>
          หมวดหมู่
          {categories.length === 0 ? (
            <span className="hint">ยังไม่มีหมวดหมู่ในระบบ — เพิ่มหมวดหมู่ก่อนสร้างวัสดุ</span>
          ) : (
            <select name="categoryId" required defaultValue="">
              <option value="" disabled>
                เลือกหมวดหมู่
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <label>
          หน่วยนับ
          <input type="text" name="unit" required />
        </label>

        <label>
          ต้นทุนมาตรฐาน
          <input type="number" name="standardCost" step="0.01" min="0" required />
        </label>

        <div className="form-actions">
          <button type="submit" disabled={categories.length === 0}>
            บันทึก
          </button>
          <Link href="/materials">ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}
