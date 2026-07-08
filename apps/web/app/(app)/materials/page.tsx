import Link from "next/link";
import type { Category, MaterialListResponse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";

function formatCurrency(value: string | number | null) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value ?? 0));
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; categoryId?: string };
}) {
  const page = Number(searchParams.page ?? "1");
  const search = searchParams.search ?? "";
  const categoryId = searchParams.categoryId ?? "";

  const query = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) {
    query.set("search", search);
  }
  if (categoryId) {
    query.set("categoryId", categoryId);
  }

  let data: MaterialListResponse;
  let categories: Category[];
  try {
    [data, categories] = await Promise.all([
      apiFetch<MaterialListResponse>(`/materials?${query.toString()}`),
      apiFetch<Category[]>("/categories"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const pageLink = (targetPage: number) => {
    const params = new URLSearchParams({ page: String(targetPage) });
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    return `/materials?${params.toString()}`;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Materials</h1>
        <Link href="/materials/new" className="btn-primary">
          + เพิ่มวัสดุ
        </Link>
      </div>

      <form className="search-form" action="/materials">
        <input type="search" name="search" placeholder="ค้นหารหัส/ชื่อวัสดุ" defaultValue={search} />
        <select name="categoryId" defaultValue={categoryId}>
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button type="submit">ค้นหา</button>
      </form>

      {data.items.length === 0 ? (
        <p className="empty-state">ไม่พบวัสดุ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>หมวดหมู่</th>
              <th>หน่วย</th>
              <th>ต้นทุนมาตรฐาน</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.code}
                  {m.barcode && <div className="hint">{m.barcode}</div>}
                </td>
                <td>{m.name}</td>
                <td>{m.category.name}</td>
                <td>{m.unit}</td>
                <td>{formatCurrency(m.standardCost)}</td>
                <td>
                  <Link href={`/materials/${m.id}/edit`} className="btn-secondary-sm">
                    แก้ไขวัสดุ
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="pagination">
        {page > 1 && <Link href={pageLink(page - 1)}>ก่อนหน้า</Link>}
        <span>
          หน้า {page} / {totalPages}
        </span>
        {page < totalPages && <Link href={pageLink(page + 1)}>ถัดไป</Link>}
      </div>
    </div>
  );
}
