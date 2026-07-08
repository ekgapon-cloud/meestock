import { Logo } from "./Logo";

/**
 * Company letterhead — shown only when printing/saving as PDF (`.print-only`),
 * since the sidebar brand already covers on-screen identification.
 */
export function PrintLetterhead() {
  return (
    <div className="print-only print-letterhead">
      <Logo size={64} />
      <div className="print-letterhead-text">
        <div className="print-company-name">บริษัท เอ็มดับเบิ้ลอี เอ็นจิเนียริ่ง จำกัด</div>
        <div className="print-company-name-en">M.Double E Engineering Co.,Ltd.</div>
      </div>
    </div>
  );
}
