import Link from "next/link";
import type { MaterialListResponse, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { createMaterialIssueAction } from "./actions";
import { ItemsField } from "./ItemsField";

export default async function NewMaterialIssuePage({ searchParams }: { searchParams: { error?: string } }) {
  let warehouses: Warehouse[];
  let materialsData: MaterialListResponse;
  try {
    // /materials caps `limit` at 100 — fine for the manual dropdown fallback while the catalog is
    // small; barcode scanning (exact by-code lookup) doesn't have this limit and is the primary path
    // for a larger catalog.
    [warehouses, materialsData] = await Promise.all([
      apiFetch<Warehouse[]>("/warehouses"),
      apiFetch<MaterialListResponse>("/materials?limit=100"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  const warehousesWithProject = warehouses.filter((w) => w.project);

  return (
    <div>
      <h1>สร้างคำขอเบิกวัสดุ</h1>
      <form action={createMaterialIssueAction} className="form-page form-page-wide">
        {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

        <label>
          ไซต์งาน / โครงการ
          {warehousesWithProject.length === 0 ? (
            <span className="hint">ไม่มีไซต์งานที่ผูกกับโครงการให้เลือก</span>
          ) : (
            <select name="warehouseId" required defaultValue="">
              <option value="" disabled>
                เลือกไซต์งาน
              </option>
              {warehousesWithProject.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} — {warehouse.project?.name}
                </option>
              ))}
            </select>
          )}
        </label>

        <ItemsField materials={materialsData.items} />

        <div className="form-actions">
          <button type="submit" disabled={warehousesWithProject.length === 0}>
            ส่งคำขอ
          </button>
          <Link href="/material-issues">ยกเลิก</Link>
        </div>
      </form>
    </div>
  );
}
