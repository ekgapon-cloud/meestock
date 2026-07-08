import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { IssueStatus, MaterialIssue } from "shared-types";
import { formatCurrency, formatDateTime } from "./format";
import { PdfLetterhead } from "./PdfLetterhead";
import { PdfSignatureBlock } from "./PdfSignatureBlock";
import { pdfStyles } from "./styles";

const STATUS_LABELS: Record<IssueStatus, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  PARTIALLY_FULFILLED: "จ่ายบางส่วน",
  FULFILLED: "จ่ายครบแล้ว",
};

const COL = { material: 3, qty: 1, approved: 1, issued: 1, cost: 1.2 };

export function MaterialIssuePdf({ issue }: { issue: MaterialIssue }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfLetterhead />

        <View style={pdfStyles.docHeader}>
          <Text style={pdfStyles.docTitle}>{issue.docNo}</Text>
          <Text style={pdfStyles.statusBadge}>{STATUS_LABELS[issue.status]}</Text>
        </View>

        <View style={pdfStyles.infoGrid}>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>โครงการ</Text>
            <Text style={pdfStyles.infoValue}>{issue.project.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ไซต์งาน</Text>
            <Text style={pdfStyles.infoValue}>{issue.warehouse.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ผู้ขอเบิก</Text>
            <Text style={pdfStyles.infoValue}>{issue.requester.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>วันที่ขอ</Text>
            <Text style={pdfStyles.infoValue}>{formatDateTime(issue.date)}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>รายการวัสดุ</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.material }]}>วัสดุ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.qty }]}>ขอเบิก</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.approved }]}>อนุมัติ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.issued }]}>จ่ายจริง</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.cost }]}>ต้นทุน/หน่วย</Text>
          </View>
          {issue.items.map((item) => (
            <View style={pdfStyles.tableRowBody} key={item.id}>
              <View style={{ flex: COL.material, padding: 6 }}>
                <Text style={pdfStyles.tableCell}>{item.material.name}</Text>
                {item.isShortfall && <Text style={pdfStyles.hint}>{item.shortfallNote}</Text>}
              </View>
              <Text style={[pdfStyles.tableCell, { flex: COL.qty }]}>{item.requestedQty}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.approved }]}>{item.approvedQty ?? "-"}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.issued }]}>{item.issuedQty ?? "-"}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.cost }]}>{formatCurrency(item.unitCost)}</Text>
            </View>
          ))}
        </View>

        {issue.approval && (issue.approval.status === "APPROVED" || issue.approval.status === "REJECTED") && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>ผลการอนุมัติ</Text>
            <Text style={pdfStyles.tableCell}>
              {issue.approval.status === "APPROVED" ? "อนุมัติแล้ว" : "ปฏิเสธ"}
              {issue.approval.note && ` — ${issue.approval.note}`}
            </Text>
          </View>
        )}

        {issue.fulfilledBy && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>ผู้จ่ายวัสดุ</Text>
            <Text style={pdfStyles.tableCell}>
              {issue.fulfilledBy.name}
              {issue.fulfilledAt && ` — ${formatDateTime(issue.fulfilledAt)}`}
            </Text>
          </View>
        )}

        <PdfSignatureBlock
          slots={[
            { label: "ผู้ขอเบิก", name: issue.requester.name },
            { label: "ผู้อนุมัติ", name: issue.approval?.approver.name },
            { label: "ผู้จ่ายวัสดุ", name: issue.fulfilledBy?.name },
            { label: "ผู้รับวัสดุ" },
          ]}
        />
      </Page>
    </Document>
  );
}
