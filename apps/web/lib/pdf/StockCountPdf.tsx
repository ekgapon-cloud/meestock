import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { StockCount } from "shared-types";
import { formatDateTime } from "./format";
import { PdfLetterhead } from "./PdfLetterhead";
import { PdfSignatureBlock } from "./PdfSignatureBlock";
import { pdfStyles } from "./styles";

const COL = { material: 3, system: 1, actual: 1, diff: 1, reason: 2 };

export function StockCountPdf({ count }: { count: StockCount }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfLetterhead />

        <View style={pdfStyles.docHeader}>
          <Text style={pdfStyles.docTitle}>{count.docNo}</Text>
        </View>

        <View style={pdfStyles.infoGrid}>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>คลัง</Text>
            <Text style={pdfStyles.infoValue}>{count.warehouse.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ผู้บันทึก</Text>
            <Text style={pdfStyles.infoValue}>{count.editedBy.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>วันที่</Text>
            <Text style={pdfStyles.infoValue}>{formatDateTime(count.date)}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>ผลการนับสต๊อก</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.material }]}>วัสดุ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.system }]}>ยอดในระบบ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.actual }]}>นับได้จริง</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.diff }]}>ส่วนต่าง</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.reason }]}>เหตุผล</Text>
          </View>
          {count.items.map((item) => {
            const diff = Number(item.actualQty) - Number(item.systemQty);
            return (
              <View style={pdfStyles.tableRowBody} key={item.id}>
                <Text style={[pdfStyles.tableCell, { flex: COL.material }]}>{item.material.name}</Text>
                <Text style={[pdfStyles.tableCell, { flex: COL.system }]}>{item.systemQty}</Text>
                <Text style={[pdfStyles.tableCell, { flex: COL.actual }]}>{item.actualQty}</Text>
                <Text style={[pdfStyles.tableCell, { flex: COL.diff }]}>{diff > 0 ? `+${diff}` : diff}</Text>
                <Text style={[pdfStyles.tableCell, { flex: COL.reason }]}>{item.reason ?? "-"}</Text>
              </View>
            );
          })}
        </View>

        <PdfSignatureBlock
          slots={[
            { label: "ผู้นับ", name: count.editedBy.name },
            { label: "ผู้ตรวจสอบ" },
            { label: "ผู้อนุมัติ" },
          ]}
        />
      </Page>
    </Document>
  );
}
