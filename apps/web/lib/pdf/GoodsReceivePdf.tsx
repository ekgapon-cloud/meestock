import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { GoodsReceive } from "shared-types";
import { formatCurrency, formatDateTime } from "./format";
import { PdfLetterhead } from "./PdfLetterhead";
import { PdfSignatureBlock } from "./PdfSignatureBlock";
import { pdfStyles } from "./styles";

const COL = { material: 3, qty: 1, cost: 1.2 };

export function GoodsReceivePdf({ goodsReceive }: { goodsReceive: GoodsReceive }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <PdfLetterhead />

        <View style={pdfStyles.docHeader}>
          <Text style={pdfStyles.docTitle}>{goodsReceive.docNo}</Text>
        </View>

        <View style={pdfStyles.infoGrid}>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ไซต์งาน</Text>
            <Text style={pdfStyles.infoValue}>{goodsReceive.warehouse.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ผู้ขาย</Text>
            <Text style={pdfStyles.infoValue}>{goodsReceive.supplier?.name ?? "-"}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ใบสั่งซื้ออ้างอิง</Text>
            <Text style={pdfStyles.infoValue}>{goodsReceive.purchaseOrder?.docNo ?? "ไม่มี"}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>ผู้บันทึก</Text>
            <Text style={pdfStyles.infoValue}>{goodsReceive.createdBy.name}</Text>
          </View>
          <View style={pdfStyles.infoTile}>
            <Text style={pdfStyles.infoLabel}>วันที่</Text>
            <Text style={pdfStyles.infoValue}>{formatDateTime(goodsReceive.date)}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>รายการวัสดุที่รับ</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.material }]}>วัสดุ</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.qty }]}>จำนวน</Text>
            <Text style={[pdfStyles.tableHeaderCell, { flex: COL.cost }]}>ต้นทุน/หน่วย</Text>
          </View>
          {goodsReceive.items.map((item) => (
            <View style={pdfStyles.tableRowBody} key={item.id}>
              <Text style={[pdfStyles.tableCell, { flex: COL.material }]}>{item.material.name}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.qty }]}>{item.quantity}</Text>
              <Text style={[pdfStyles.tableCell, { flex: COL.cost }]}>{formatCurrency(item.unitCost)}</Text>
            </View>
          ))}
        </View>

        <PdfSignatureBlock
          slots={[
            { label: "ผู้รับของ", name: goodsReceive.createdBy.name },
            { label: "ผู้ตรวจสอบ" },
            { label: "ผู้ส่งของ (ตัวแทนผู้ขาย)" },
          ]}
        />
      </Page>
    </Document>
  );
}
