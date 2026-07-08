import Link from "next/link";

export default function ReportsIndexPage() {
  return (
    <div>
      <h1>รายงาน</h1>
      <ul className="report-links">
        <li>
          <Link href="/reports/site-summary">สรุปการเงินตามไซต์งาน</Link>
        </li>
        <li>
          <Link href="/reports/stock-value">มูลค่าสต๊อกคงเหลือ</Link>
        </li>
        <li>
          <Link href="/reports/issue-history">ประวัติการเบิกจ่าย</Link>
        </li>
      </ul>
    </div>
  );
}
