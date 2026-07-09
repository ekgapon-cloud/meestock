import Link from "next/link";
import type { IssueStatus, Me, MaterialIssue } from "shared-types";
import { apiFetch, ApiError, redirectToLogin } from "../../../../lib/api";
import { Logo } from "../../../../components/Logo";
import { DownloadPdfButton } from "../../DownloadPdfButton";
import { approveMaterialIssueAction, fulfillMaterialIssueAction, rejectMaterialIssueAction } from "./actions";

const STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  PARTIALLY_FULFILLED: "จ่ายบางส่วน",
  FULFILLED: "จ่ายครบแล้ว",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatCurrency(value: string | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}

export default async function MaterialIssueDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  let issue: MaterialIssue;
  let me: Me;
  try {
    [issue, me] = await Promise.all([
      apiFetch<MaterialIssue>(`/material-issues/${params.id}`),
      apiFetch<Me>("/auth/me"),
    ]);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        redirectToLogin();
      }
      if (err.status === 404) {
        return <div className="empty-state">ไม่พบคำขอเบิกนี้</div>;
      }
      if (err.status === 403) {
        return <div className="empty-state">ไม่มีสิทธิ์เข้าถึงคำขอนี้</div>;
      }
    }
    throw err;
  }

  const isOwnRequest = me.id === issue.requesterId;
  const canApproveOrReject =
    issue.status === "PENDING_APPROVAL" && !isOwnRequest && (me.role === "APPROVER" || me.accessLevel === "ADMIN");
  const canFulfill = issue.status === "APPROVED" && (me.role === "WAREHOUSE" || me.accessLevel === "ADMIN");

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <Logo size={56} />
          <h1>{issue.docNo}</h1>
        </div>
        <div className="page-header-actions">
          <span className={`status-badge status-${issue.status.toLowerCase()}`}>{STATUS_LABELS[issue.status]}</span>
          {issue.isOverdue && <span className="status-badge status-overdue">เกินกำหนด</span>}
          <DownloadPdfButton href={`/api/material-issues/${issue.id}/pdf`} />
        </div>
      </div>

      {searchParams.error && <div className="error-banner">{searchParams.error}</div>}

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">โครงการ</div>
          <div className="stat-value-sm">{issue.project.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ไซต์งาน</div>
          <div className="stat-value-sm">{issue.warehouse.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">ผู้ขอเบิก</div>
          <div className="stat-value-sm">{issue.requester.name}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">วันที่ขอ</div>
          <div className="stat-value-sm">{formatDateTime(issue.date)}</div>
        </div>
      </div>

      <h2>รายการวัสดุ</h2>
      <table>
        <thead>
          <tr>
            <th>วัสดุ</th>
            <th>ขอเบิก</th>
            <th>อนุมัติ</th>
            <th>จ่ายจริง</th>
            <th>ต้นทุน/หน่วย</th>
          </tr>
        </thead>
        <tbody>
          {issue.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.material.name}
                {item.isShortfall && <div className="hint">{item.shortfallNote}</div>}
              </td>
              <td>{item.requestedQty}</td>
              <td>{item.approvedQty ?? "-"}</td>
              <td>{item.issuedQty ?? "-"}</td>
              <td>{formatCurrency(item.unitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {issue.approval && (issue.approval.status === "APPROVED" || issue.approval.status === "REJECTED") && (
        <section>
          <h2>ผลการอนุมัติ</h2>
          <p>
            {issue.approval.status === "APPROVED" ? "อนุมัติแล้ว" : "ปฏิเสธ"}
            {issue.approval.note && ` — ${issue.approval.note}`}
          </p>
        </section>
      )}

      {issue.fulfilledBy && (
        <section>
          <h2>ผู้จ่ายวัสดุ</h2>
          <p>
            {issue.fulfilledBy.name}
            {issue.fulfilledAt && ` — ${formatDateTime(issue.fulfilledAt)}`}
          </p>
        </section>
      )}

      {(canApproveOrReject || canFulfill) && (
        <section className="form-actions">
          {canApproveOrReject && (
            <>
              <form action={approveMaterialIssueAction.bind(null, issue.id)} className="qty-form">
                <table>
                  <thead>
                    <tr>
                      <th>วัสดุ</th>
                      <th>ขอเบิก</th>
                      <th>จำนวนที่อนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issue.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.material.name}</td>
                        <td>{item.requestedQty}</td>
                        <td>
                          <input
                            type="number"
                            name={`approvedQty__${item.materialId}`}
                            min="0"
                            max={item.requestedQty}
                            step="1"
                            defaultValue={item.requestedQty}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="submit">อนุมัติ</button>
              </form>
              <form action={rejectMaterialIssueAction.bind(null, issue.id)} className="reject-form">
                <input type="text" name="reason" placeholder="เหตุผลที่ปฏิเสธ" required />
                <button type="submit" className="btn-danger-sm">
                  ปฏิเสธ
                </button>
              </form>
            </>
          )}
          {canFulfill && (
            <form action={fulfillMaterialIssueAction.bind(null, issue.id)} className="qty-form">
              <table>
                <thead>
                  <tr>
                    <th>วัสดุ</th>
                    <th>อนุมัติ</th>
                    <th>จำนวนที่จ่ายจริง</th>
                  </tr>
                </thead>
                <tbody>
                  {issue.items.map((item) => {
                    const approvedQty = item.approvedQty ?? item.requestedQty;
                    return (
                      <tr key={item.id}>
                        <td>{item.material.name}</td>
                        <td>{approvedQty}</td>
                        <td>
                          <input
                            type="number"
                            name={`issuedQty__${item.materialId}`}
                            min="0"
                            max={approvedQty}
                            step="1"
                            defaultValue={approvedQty}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button type="submit">จ่ายวัสดุ</button>
            </form>
          )}
        </section>
      )}

      <p className="print-hide">
        <Link href="/material-issues">← กลับไปรายการคำขอ</Link>
      </p>
    </div>
  );
}
