import Link from "next/link";
import type { Category, Material } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../../lib/api";
import { BarcodeField } from "../../BarcodeField";
import { UnitField } from "../../UnitField";
import { updateMaterialAction } from "./actions";

export default async function EditMaterialPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  let material: Material;
  let categories: Category[];
  let units: string[];
  try {
    [material, categories, units] = await Promise.all([
      apiFetch<Material>(`/materials/${params.id}`),
      apiFetch<Category[]>("/categories"),
      apiFetch<string[]>("/materials/units"),
    ]);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) redirectToLogin();
      if (err.status === 404) return <div className="empty-state">ไม่พบวัสดุนี้</div>;
    }
    throw err;
  }

  return (
    <div>
      <h1>แก้ไขวัสดุ</h1>
      <form action={updateMaterialAction.bind(null, material.id)} className="form-page">
        {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

        <label>
          รหัสวัสดุ
          <input type="text" name="code" defaultValue={material.code} required />
        </label>

        <label>
          บาร์โค้ด (ถ้ามี)
          <BarcodeField defaultValue={material.barcode ?? ""} />
        </label>

        <label>
          ชื่อวัสดุ
          <input type="text" name="name" defaultValue={material.name} required />
        </label>

        <label>
          หมวดหมู่
          <select name="categoryId" required defaultValue={material.categoryId}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          หน่วยนับ
          <UnitField units={units} defaultValue={material.unit} />
        </label>

        <label>
          ราคาปัจจุบัน
          <input type="number" name="standardCost" step="0.01" min="0" defaultValue={material.standardCost ?? "0"} required />
        </label>

        <div className="form-actions">
          <button type="submit">บันทึก</button>
          <Link href="/materials">ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}
