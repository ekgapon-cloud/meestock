"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

/**
 * Camera-based barcode scan, as an alternative input path alongside the existing
 * HID-scanner-as-keyboard flow (see ItemsField/CostedItemsField) — for phones/tablets
 * with no external scanner hardware attached.
 */
export function CameraScanButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setError(null);
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, err) => {
          if (cancelled) return;
          if (result) {
            onDetected(result.getText());
            setOpen(false);
          }
          // NotFoundException fires continuously while no barcode is in frame — not a real error.
          if (err && err.name !== "NotFoundException") {
            setError("อ่านบาร์โค้ดไม่สำเร็จ ลองใหม่อีกครั้ง");
          }
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("เปิดกล้องไม่สำเร็จ — ตรวจสอบสิทธิ์การใช้กล้องของเบราว์เซอร์");
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected]);

  return (
    <>
      <button type="button" className="btn-secondary-sm" onClick={() => setOpen(true)}>
        📷 สแกนด้วยกล้อง
      </button>

      {open && (
        <div className="camera-scan-overlay" role="dialog" aria-modal="true">
          <div className="camera-scan-box">
            <video ref={videoRef} className="camera-scan-video" muted playsInline />
            {error && <div className="error-banner">{error}</div>}
            <button type="button" onClick={() => setOpen(false)}>
              ปิดกล้อง
            </button>
          </div>
        </div>
      )}
    </>
  );
}
