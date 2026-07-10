import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { StockTransfer } from "shared-types";
import { formatCurrency, formatDateTime } from "./format";
import { PdfLetterhead } from "./PdfLetterhead";
import { PdfSignatureBlock } from "./PdfSignatureBlock";
import { pdfStyles } from "./styles";

const COL = { material: 3, qty: 1, cost: 1.2 };

export function StockTransferPdf({ transfer }: { transfer: StockTransfer }) {
  // unitCost is present only when the requesting user may see cost (API redacts it to null for STAFF).
  const showCost = transfer.items.some((item) => item.unitCost != null);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfLetterhead />

        <View style={pdfStyles.docHeader}>
          <Text style={pdfStyles.docTitle}>{transfer.docNo}</Text>
        </View>

        <View style={pdfStyles.infoGrid}>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>จากคลัง (ต้นทาง)</Text>
            <Text style={pdfStyles.infoValue}>{transfer.fromWarehouse.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ไปคลัง (ปลายทาง)</Text>
            <Text style={pdfStyles.infoValue}>{transfer.toWarehouse.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ผู้บันทึก</Text>
            <Text style={pdfStyles.infoValue}>{transfer.createdBy.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>วันที่</Text>
            <Text style={pdfStyles.infoValue}>{formatDateTime(transfer.date)}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>รายการวัสดุที่โอน</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.material }]}>วัสดุ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.qty }]}>จำนวน</Text>
            {showCost && <Text style={[pdfStyles.tableHeaderCell, { flex: COL.cost }]}>ต้นทุน/หน่วย</Text>}
          </View>
          {transfer.items.map((item) => (
            <View style={pdfStyles.tableRowBody} key={item.id}>
              <Text style={[pdfStyles.tableCell, { flex: COL.material }]}>{item.material.name}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.qty }]}>{item.quantity}</Text>
              {showCost && (
                <Text style={[pdfStyles.tableCell, { flex: COL.cost }]}>{formatCurrency(item.unitCost ?? null)}</Text>
              )}
            </View>
          ))}
        </View>

        <PdfSignatureBlock
          slots={[
            { label: "ผู้โอน (คลังต้นทาง)", name: transfer.createdBy.name },
            { label: "ผู้รับ (คลังปลายทาง)" },
            { label: "ผู้อนุมัติ" },
          ]}
        />
      </Page>
    </Document>
  );
}
