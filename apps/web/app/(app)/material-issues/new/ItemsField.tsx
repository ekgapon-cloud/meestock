"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import type { Material } from "shared-types";
import { CameraScanButton } from "../../../../components/CameraScanButton";

interface Row {
  materialId: string;
  label: string;
  qty: number;
}

export function ItemsField({ materials }: { materials: Material[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  function addOrIncrement(materialId: string, label: string) {
    setRows((prev) => {
      const existing = prev.find((r) => r.materialId === materialId);
      if (existing) {
        return prev.map((r) => (r.materialId === materialId ? { ...r, qty: r.qty + 1 } : r));
      }
      return [...prev, { materialId, label, qty: 1 }];
    });
  }

  function removeRow(materialId: string) {
    setRows((prev) => prev.filter((r) => r.materialId !== materialId));
  }

  function updateQty(materialId: string, qty: number) {
    setRows((prev) => prev.map((r) => (r.materialId === materialId ? { ...r, qty } : r)));
  }

  const lookupAndAdd = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setScanError(null);
    const res = await fetch(`/api/materials/by-code/${encodeURIComponent(code)}`);
    if (!res.ok) {
      setScanError(`ไม่พบวัสดุรหัส "${code}"`);
      setScanValue("");
      return;
    }
    const material = (await res.json()) as Material;
    addOrIncrement(material.id, `${material.code} — ${material.name}`);
    setScanValue("");
  }, []);

  function handleScanKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    void lookupAndAdd(scanValue);
  }

  function handleAddManual() {
    if (!selectedMaterialId) return;
    const material = materials.find((m) => m.id === selectedMaterialId);
    if (!material) return;
    addOrIncrement(material.id, `${material.code} — ${material.name}`);
    setSelectedMaterialId("");
  }

  return (
    <div className="items-field">
      <label>
        สแกนบาร์โค้ด
        <div className="scan-input-row">
          <input
            type="text"
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            onKeyDown={handleScanKeyDown}
            placeholder="สแกนหรือพิมพ์รหัสวัสดุแล้วกด Enter"
            autoFocus
          />
          <CameraScanButton onDetected={(code) => void lookupAndAdd(code)} />
        </div>
      </label>
      {scanError && <div className="error-banner">{scanError}</div>}

      <div className="manual-add-row">
        <select value={selectedMaterialId} onChange={(event) => setSelectedMaterialId(event.target.value)}>
          <option value="">-- เลือกวัสดุ --</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.code} — {material.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleAddManual}>
          + เพิ่ม
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="empty-state">ยังไม่มีรายการวัสดุ</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>วัสดุ</th>
              <th>จำนวน</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.materialId}>
                <td>
                  {row.label}
                  <input type="hidden" name="materialId" value={row.materialId} />
                </td>
                <td>
                  <input
                    type="number"
                    name="qty"
                    min="0.01"
                    step="0.01"
                    value={row.qty}
                    onChange={(event) => updateQty(row.materialId, Number(event.target.value))}
                  />
                </td>
                <td>
                  <button type="button" className="btn-danger-sm" onClick={() => removeRow(row.materialId)}>
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
