"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  children: ReactNode;
  className?: string;
  /** Extra disable condition from the page, combined with the in-flight state. */
  disabled?: boolean;
  /** If set, a browser confirm() must be accepted before the form submits (guards irreversible posts). */
  confirmMessage?: string;
  /** Label shown while the action is in flight. */
  pendingLabel?: string;
}

/**
 * Submit button that disables itself while the enclosing <form>'s action is in flight, so a
 * double-click can't post a ledger entry (issue/receive/transfer/count) or create a document
 * twice — the most common warehouse-floor human error. Must render inside a <form>, since
 * useFormStatus reads that form's pending state. With `confirmMessage` it also requires a
 * confirm() before submitting; without JS the form still submits normally (graceful fallback).
 */
export function SubmitButton({ children, className, disabled, confirmMessage, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      onClick={
        confirmMessage
          ? (event) => {
              if (!window.confirm(confirmMessage)) event.preventDefault();
            }
          : undefined
      }
    >
      {pending ? (pendingLabel ?? "กำลังบันทึก…") : children}
    </button>
  );
}
