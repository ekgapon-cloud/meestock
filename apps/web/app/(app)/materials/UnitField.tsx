"use client";

import { useState } from "react";

const ADD_NEW = "__add_new__";

/**
 * Free-text unit entry let typos through (e.g. "เมตร" vs "ม." vs "Meter" all meaning the
 * same thing but never matching each other in reports/filters) -- so this defaults to a
 * dropdown of units already used by existing materials, with an explicit "add new unit"
 * escape hatch for the first material of a kind that genuinely needs one.
 */
export function UnitField({ units, defaultValue = "" }: { units: string[]; defaultValue?: string }) {
  const startsKnown = units.length > 0 && (defaultValue === "" || units.includes(defaultValue));
  const [mode, setMode] = useState<"select" | "new">(startsKnown ? "select" : "new");
  const [selectValue, setSelectValue] = useState(startsKnown ? defaultValue : ADD_NEW);
  const [newValue, setNewValue] = useState(startsKnown ? "" : defaultValue);

  if (mode === "new") {
    return (
      <div className="scan-input-row">
        <input
          type="text"
          name="unit"
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
          placeholder="พิมพ์หน่วยนับใหม่"
          required
          autoFocus
        />
        {units.length > 0 && (
          <button
            type="button"
            className="btn-secondary-sm"
            onClick={() => {
              setMode("select");
              setNewValue("");
              setSelectValue("");
            }}
          >
            เลือกจากรายการ
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      name="unit"
      value={selectValue}
      required
      onChange={(event) => {
        const value = event.target.value;
        setSelectValue(value);
        if (value === ADD_NEW) setMode("new");
      }}
    >
      <option value="" disabled>
        เลือกหน่วยนับ
      </option>
      {units.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
      <option value={ADD_NEW}>+ เพิ่มหน่วยนับใหม่</option>
    </select>
  );
}
