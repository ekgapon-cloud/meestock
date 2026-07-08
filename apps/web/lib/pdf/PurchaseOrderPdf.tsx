import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { POStatus, PurchaseOrder } from "shared-types";
import { formatCurrency, formatDateTime } from "./format";
import { PdfLetterhead } from "./PdfLetterhead";
import { PdfSignatureBlock } from "./PdfSignatureBlock";
import { pdfStyles } from "./styles";

const STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: "ร่าง",
  ORDERED: "สั่งซื้อแล้ว",
  PARTIALLY_RECEIVED: "รับบางส่วน",
  RECEIVED: "รับครบแล้ว",
  CANCELLED: "ยกเลิก",
};

const COL = { material: 3, ordered: 1, received: 1, cost: 1.2 };

export function PurchaseOrderPdf({ po }: { po: PurchaseOrder }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfLetterhead />

        <View style={pdfStyles.docHeader}>
          <Text style={pdfStyles.docTitle}>{po.docNo}</Text>
          <Text style={pdfStyles.statusBadge}>{STATUS_LABELS[po.status]}</Text>
        </View>

        <View style={pdfStyles.infoGrid}>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ผู้ขาย</Text>
            <Text style={pdfStyles.infoValue}>{po.supplier.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ผู้สร้าง</Text>
            <Text style={pdfStyles.infoValue}>{po.createdBy.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>วันที่สร้าง</Text>
            <Text style={pdfStyles.infoValue}>{formatDateTime(po.date)}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>รายการวัสดุ</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.material }]}>วัสดุ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.ordered }]}>สั่งซื้อ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.received }]}>รับแล้ว</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.cost }]}>ต้นทุน/หน่วย</Text>
          </View>
          {po.items.map((item) => (
            <View style={pdfStyles.tableRowBody} key={item.id}>
              <Text style={[pdfStyles.tableCell, { flex: COL.material }]}>{item.material.name}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.ordered }]}>{item.orderedQty}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.received }]}>{item.receivedQty}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.cost }]}>{formatCurrency(item.unitCost)}</Text>
            </View>
          ))}
        </View>

        <PdfSignatureBlock
          slots={[
            { label: "ผู้จัดทำ", name: po.createdBy.name },
            { label: "ผู้อนุมัติสั่งซื้อ" },
            { label: "ผู้ตรวจสอบ" },
          ]}
        />
      </Page>
    </Document>
  );
}
