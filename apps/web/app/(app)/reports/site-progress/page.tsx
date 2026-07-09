import Link from "next/link";
import type { SiteProgressReport } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { SiteDetailTable } from "../../../../components/SiteDetailTable";

export default async function SiteProgressReportPage() {
  let report: SiteProgressReport;
  try {
    report = await apiFetch<SiteProgressReport>("/reports/site-progress");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirectToLogin();
    throw err;
  }

  return (
    <div>
      <h1>สัดส่วนสต๊อกตามไซต์ที่ยังไม่จบโครงการ</h1>
      <p className="hint">แสดงเป็นเปอร์เซ็นต์ ไม่มีมูลค่าเงิน — เฉพาะไซต์ที่โครงการยังไม่จบ (วางแผน / กำลังดำเนินการ)</p>

      <SiteDetailTable sites={report.sites} />

      <p>
        <Link href="/reports">← กลับไปหน้ารายงาน</Link>
      </p>
    </div>
  );
}
