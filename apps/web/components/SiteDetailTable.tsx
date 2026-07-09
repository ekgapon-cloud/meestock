import type { ActiveProjectValueSite, ProjectStatus } from "shared-types";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "วางแผน",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "จบโครงการ",
  CANCELLED: "ยกเลิก",
};

export function formatProjectDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export function SiteDetailTable<T extends ActiveProjectValueSite>({
  sites,
  showValue,
}: {
  sites: T[];
  showValue?: (site: T) => string;
}) {
  if (sites.length === 0) {
    return <p className="empty-state">ไม่มีไซต์ที่โครงการยังไม่จบ</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th>ไซต์</th>
          <th>สถานะ</th>
          <th>เริ่ม – สิ้นสุด</th>
          <th>สัดส่วน</th>
          {showValue ? <th>มูลค่า</th> : null}
        </tr>
      </thead>
      <tbody>
        {sites.map((site) => (
          <tr key={site.warehouseId}>
            <td>{site.warehouseName}</td>
            <td>
              <span className={`status-badge status-${site.status.toLowerCase()}`}>
                {PROJECT_STATUS_LABELS[site.status] ?? site.status}
              </span>
            </td>
            <td>
              {formatProjectDate(site.startDate)} – {site.endDate ? formatProjectDate(site.endDate) : "ไม่ระบุ"}
            </td>
            <td>{site.percentage.toFixed(1)}%</td>
            {showValue ? <td>{showValue(site)}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
