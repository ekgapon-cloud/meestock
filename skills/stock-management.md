# Skill: Stock Management — MEE Stock

ใช้ไฟล์นี้เมื่อทำงานเกี่ยวกับยอดคงเหลือ, ledger, การรับเข้า/เบิกจ่ายวัสดุ

## หลักการหลัก: Ledger-based Stock Balance

- ยอดคงเหลือ **ไม่ใช่ field ที่เก็บและอัปเดตตรง** แต่เป็นผลรวมของ transaction ใน `StockLedger`
- สูตรพื้นฐาน:
  ```
  StockBalance(material, site) = SUM(quantity) FROM StockLedger
    WHERE materialId = :material AND siteId = :site
  ```
- `quantity` เป็น signed value: บวก = เพิ่มสต๊อก (เช่น RECEIVE, RETURN), ลบ = ลดสต๊อก (เช่น ISSUE)

## ประเภท Transaction (Ledger Type)

| Type | ผลต่อสต๊อก | เมื่อไหร่ใช้ |
|------|-----------|--------------|
| `RECEIVE` | + | รับวัสดุเข้าคลัง (จาก PO หรือแหล่งอื่น) |
| `ISSUE` | - | จ่ายวัสดุออกตามคำขอเบิกที่อนุมัติแล้ว |
| `ADJUSTMENT` | +/- | ปรับปรุงยอดจากการนับสต๊อกจริง ต้องมีเหตุผล |
| `RETURN` | + | คืนวัสดุที่เบิกไปแล้วแต่ไม่ได้ใช้ |
| `TRANSFER_OUT` | - | โอนวัสดุออกไปไซต์อื่น |
| `TRANSFER_IN` | + | รับโอนวัสดุจากไซต์อื่น |

## กฎสำคัญเมื่อเขียนโค้ดเกี่ยวกับ Stock

1. **ทุกการเปลี่ยนแปลงสต๊อกต้องสร้าง `StockLedger` record** — ไม่มีข้อยกเว้น
2. **ใช้ Prisma transaction (`$transaction`)** เมื่อการดำเนินการเกี่ยวข้องกับหลายตาราง (เช่น update `MaterialIssueRequest.status` พร้อมสร้าง `StockLedger`) เพื่อความ atomic
3. **ห้ามลบ ledger record** หากต้องแก้ไข ให้สร้าง `ADJUSTMENT` record ใหม่เพื่อ offset แทน (reversal pattern)
4. **ตรวจสอบยอดคงเหลือก่อนอนุมัติ ISSUE เสมอ** เพื่อป้องกันยอดติดลบ (เว้นแต่เปิด backorder flag)
5. เมื่อ query ยอดคงเหลือบ่อยๆ (เช่นหน้า dashboard) ควรพิจารณา cached/materialized balance table แต่ต้องมี mechanism sync กับ ledger อย่างสม่ำเสมอ ไม่ใช้แทน ledger

## ตัวอย่าง Pseudo-code: การจ่ายวัสดุ (Issue)

```ts
async function issueMaterial(requestId: string, issuedBy: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.materialIssueRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { items: true },
    });

    if (request.status !== "APPROVED") {
      throw new AppError("INVALID_WORKFLOW_STATE", "คำขอต้องอยู่สถานะ APPROVED ก่อน");
    }

    for (const item of request.items) {
      const balance = await getStockBalance(tx, item.materialId, request.siteId);
      if (balance < item.quantityRequested) {
        throw new AppError("INSUFFICIENT_STOCK", `สต๊อกไม่พอสำหรับ ${item.materialId}`);
      }

      await tx.stockLedger.create({
        data: {
          materialId: item.materialId,
          siteId: request.siteId,
          type: "ISSUE",
          quantity: -item.quantityRequested,
          referenceType: "MaterialIssueRequest",
          referenceId: request.id,
          createdBy: issuedBy,
        },
      });
    }

    return tx.materialIssueRequest.update({
      where: { id: requestId },
      data: { status: "ISSUED", issuedBy },
    });
  });
}
```

## การนับสต๊อกจริง (Stock Take / Physical Count)

1. บันทึกยอดที่นับได้จริง
2. เปรียบเทียบกับยอดในระบบ
3. หากต่างกัน สร้าง `ADJUSTMENT` transaction พร้อมระบุเหตุผล (เช่น "นับสต๊อกประจำเดือน", "วัสดุชำรุด")
4. ต้องมีการอนุมัติจาก Storekeeper หรือ Admin (ดู `docs/business-rules.md`)
