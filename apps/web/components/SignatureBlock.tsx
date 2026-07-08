interface SignatureSlot {
  label: string;
  name?: string;
}

/** Signature lines for the printed/PDF document footer — standard for internal requisition paperwork. */
export function SignatureBlock({ slots }: { slots: SignatureSlot[] }) {
  return (
    <div className="signature-block">
      {slots.map((slot) => (
        <div className="signature-slot" key={slot.label}>
          <div className="signature-line" />
          <div className="signature-name">{slot.name || " "}</div>
          <div className="signature-label">{slot.label}</div>
          <div className="signature-date">วันที่ ____ / ____ / ____</div>
        </div>
      ))}
    </div>
  );
}
