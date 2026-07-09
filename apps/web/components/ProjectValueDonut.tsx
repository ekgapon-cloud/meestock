import type { ActiveProjectValueSite } from "shared-types";

const SIZE = 108;
const STROKE_WIDTH = 16;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP_PX = 2;

function seriesColorVar(index: number) {
  return `var(--chart-series-${(index % 8) + 1})`;
}

/**
 * Percentage-only ring — money (when the caller has it, i.e. MANAGER/ADMIN accessLevel) belongs
 * in the accompanying site-detail table elsewhere on the page, not this widget. `sites` accepts
 * either the executive (money-bearing) or staff (percentage-only) breakdown since both are
 * structurally a superset of `ActiveProjectValueSite`.
 */
export function ProjectValueDonut({ sites }: { sites: ActiveProjectValueSite[] }) {
  if (sites.length === 0) {
    return <p className="empty-state">ไม่มีไซต์ที่โครงการยังไม่จบ</p>;
  }

  const gap = sites.length > 1 ? SEGMENT_GAP_PX : 0;
  let cumulativeOffset = 0;
  const segments = sites.map((site, index) => {
    const rawLength = (site.percentage / 100) * CIRCUMFERENCE;
    const dash = Math.max(0, rawLength - gap);
    const offset = -cumulativeOffset;
    cumulativeOffset += rawLength;
    return { site, dash, offset, color: seriesColorVar(index) };
  });

  return (
    <div className="donut-compact">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="donut-chart"
        role="img"
        aria-label="สัดส่วนสต๊อกตามไซต์ที่ยังไม่จบโครงการ"
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--color-bg)" strokeWidth={STROKE_WIDTH} />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map(({ site, dash, offset, color }) => (
            <circle
              key={site.warehouseId}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={offset}
            >
              <title>{`${site.projectName}: ${site.percentage.toFixed(1)}%`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <div className="bento-list">
        {segments.map(({ site, color }) => (
          <div className="bento-list-row" key={site.warehouseId}>
            <span className="donut-legend-label">
              <span className="donut-legend-swatch" style={{ background: color }} />
              {site.warehouseName}
            </span>
            <span>{site.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
