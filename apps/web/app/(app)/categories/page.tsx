import type { Category, Me } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../lib/api";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

export default async function CategoriesPage({ searchParams }: { searchParams: { error?: string } }) {
  let categories: Category[];
  let me: Me;
  try {
    [categories, me] = await Promise.all([
      apiFetch<Category[]>("/categories"),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  const canManage = me.accessLevel === "ADMIN" || me.accessLevel === "MANAGER" || me.role === "WAREHOUSE";

  return (
    <div>
      <div className="page-header">
        <h1>หมวดหมู่วัสดุ</h1>
      </div>

      {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

      {canManage && (
        <form action={createCategoryAction} className="manual-add-row">
          <input type="text" name="name" placeholder="ชื่อหมวดหมู่ใหม่" required />
          <button type="submit">+ เพิ่มหมวดหมู่</button>
        </form>
      )}

      {categories.length === 0 ? (
        <p className="empty-state">ยังไม่มีหมวดหมู่</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ชื่อหมวดหมู่</th>
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  {canManage ? (
                    <form action={updateCategoryAction.bind(null, category.id)} className="manual-add-row">
                      <input type="text" name="name" defaultValue={category.name} required />
                      <button type="submit">บันทึก</button>
                    </form>
                  ) : (
                    category.name
                  )}
                </td>
                {canManage && (
                  <td>
                    <form action={deleteCategoryAction.bind(null, category.id)}>
                      <button type="submit" className="btn-danger-sm">
                        ลบ
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
