"use client";

import { useState } from "react";
import { CameraScanButton } from "../../../components/CameraScanButton";

export function BarcodeField({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="scan-input-row">
      <input
        type="text"
        name="barcode"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="สแกนหรือพิมพ์บาร์โค้ด"
      />
      <CameraScanButton onDetected={(code) => setValue(code)} />
    </div>
  );
}
