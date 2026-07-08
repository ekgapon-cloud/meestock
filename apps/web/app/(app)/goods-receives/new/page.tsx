import Link from "next/link";
import type { MaterialListResponse, PurchaseOrderListResponse, Supplier, Warehouse } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { CostedItemsField } from "../../../../components/CostedItemsField";
import { createGoodsReceiveAction } from "./actions";

export default async function NewGoodsReceivePage({
  searchParams,
}: {
  searchParams: { warehouseId?: string; poId?: string; error?: string };
}) {
  let warehouses: Warehouse[];
  let poData: PurchaseOrderListResponse;
  let suppliers: Supplier[];
  let materialsData: MaterialListResponse;
  try {
    [warehouses, poData, suppliers, materialsData] = await Promise.all([
      apiFetch<Warehouse[]>("/warehouses"),
      apiFetch<PurchaseOrderListResponse>("/purchase-orders?limit=100"),
      apiFetch<Supplier[]>("/suppliers"),
      apiFetch<MaterialListResponse>("/materials?limit=100"),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirectToLogin();
    }
    throw err;
  }

  const receivablePOs = poData.items.filter((po) => po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED");
  const selectedPO = searchParams.poId ? receivablePOs.find((po) => po.id === searchParams.poId) : undefined;
  const remainingItems = selectedPO
    ? selectedPO.items
        .map((item) => ({ ...item, remaining: Number(item.orderedQty) - Number(item.receivedQty) }))
        .filter((item) => item.remaining > 0)
    : [];

  return (
    <div>
      <h1>รับวัสดุเข้าคลัง</h1>

      <form method="GET" className="filter-form">
        <select name="warehouseId" defaultValue={searchParams.warehouseId ?? ""} required>
          <option value="" disabled>
            เลือกไซต์งานปลายทาง
          </option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <select name="poId" defaultValue={searchParams.poId ?? ""}>
          <option value="">-- ไม่มีใบสั่งซื้ออ้างอิง --</option>
          {receivablePOs.map((po) => (
            <option key={po.id} value={po.id}>
              {po.docNo} — {po.supplier.name}
            </option>
          ))}
        </select>
        <button type="submit">โหลดรายการ</button>
      </form>

      {!searchParams.warehouseId ? (
        <p className="empty-state">เลือกไซต์งานปลายทางก่อนเพื่อเริ่มรับวัสดุ</p>
      ) : (
        <form action={createGoodsReceiveAction} className="form-page form-page-wide">
          {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

          <input type="hidden" name="warehouseId" value={searchParams.warehouseId} />

          {selectedPO ? (
            <>
              <input type="hidden" name="purchaseOrderId" value={selectedPO.id} />
              <p className="hint">
                อ้างอิงใบสั่งซื้อ {selectedPO.docNo} — {selectedPO.supplier.name}
              </p>
              {remainingItems.length === 0 ? (
                <p className="empty-state">ใบสั่งซื้อนี้รับครบทุกรายการแล้ว</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>วัสดุ</th>
                      <th>ค้างรับ</th>
                      <th>รับจริงครั้งนี้</th>
                      <th>ต้นทุน/หน่วย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remainingItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.material.name}
                          <input type="hidden" name="materialId" value={item.materialId} />
                        </td>
                        <td>{item.remaining}</td>
                        <td>
                          <input type="number" name="qty" min="0" max={item.remaining} step="0.01" defaultValue={item.remaining} />
                        </td>
                        <td>
                          <input type="number" name="unitCost" min="0" step="0.01" defaultValue={item.unitCost} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <>
              <label>
                ผู้ขาย
                <select name="supplierId" required defaultValue="">
                  <option value="" disabled>
                    เลือกผู้ขาย
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <span className="hint">ไม่มี PO อ้างอิง — ต้องระบุผู้ขายเอง (เช่น รับบริจาค/โอนจากไซต์อื่น)</span>
              </label>
              <CostedItemsField materials={materialsData.items} />
            </>
          )}

          <div className="form-actions">
            <button type="submit" disabled={!!selectedPO && remainingItems.length === 0}>
              บันทึกการรับวัสดุ
            </button>
            <Link href="/goods-receives">ยกเลิก</Link>
          </div>
        </form>
      )}
    </div>
  );
}
