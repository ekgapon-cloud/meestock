# Skill: Site Costing — MEE Stock

ใช้ไฟล์นี้เมื่อทำงานเกี่ยวกับการคำนวณต้นทุนวัสดุต่อไซต์งาน

## หลักการคำนวณต้นทุน

- ใช้วิธี **Weighted Average Cost (ต้นทุนเฉลี่ยถ่วงน้ำหนัก)** เป็นค่าเริ่มต้น เว้นแต่มีการระบุวิธีอื่นภายหลัง (เช่น FIFO)
- ต้นทุนเฉลี่ยคำนวณใหม่ทุกครั้งที่มีการรับเข้าสต๊อก (RECEIVE) ที่มีราคาต่างจากเดิม

### สูตร Weighted Average Cost

```
NewAvgCost = ((OldQuantity * OldAvgCost) + (ReceivedQuantity * ReceivedUnitCost))
             / (OldQuantity + ReceivedQuantity)
```

## การคำนวณต้นทุนต่อไซต์งาน

- ต้นทุนของไซต์งานหนึ่งๆ มาจาก **การเบิกจ่ายจริง (ISSUE transactions)** ของไซต์นั้นเท่านั้น
- สูตรพื้นฐาน:
  ```
  SiteCost(site, ช่วงเวลา) = SUM(quantity_issued * avgCostAtTimeOfIssue)
    FROM StockLedger WHERE type = 'ISSUE' AND siteId = :site AND createdAt BETWEEN ...
  ```
- **สำคัญ**: ต้องบันทึก `unitCostAtTransaction` ลงใน ledger record ณ เวลาที่เกิด transaction เพื่อไม่ให้ต้นทุนย้อนหลังเปลี่ยนไปตามราคาปัจจุบัน

## กรณีโอนวัสดุระหว่างไซต์ (Transfer)

- ต้นทุนที่โอนไปต้องอ้างอิงจาก avgCost ของวัสดุนั้น ณ เวลาที่โอน (`TRANSFER_OUT`)
- ไซต์ปลายทางรับต้นทุนเดียวกันเข้ามา (`TRANSFER_IN`) และรวมเข้ากับ avgCost ของไซต์ปลายทางตามสูตร weighted average

## รายงานต้นทุนที่ควรรองรับ

1. ต้นทุนวัสดุคงเหลือ ณ ปัจจุบัน แยกตามไซต์งาน
2. ต้นทุนการเบิกจ่ายสะสมต่อไซต์งาน (รายเดือน/รายไตรมาส)
3. เปรียบเทียบต้นทุนจริงกับงบประมาณที่ตั้งไว้ต่อไซต์ (ถ้ามีฟีเจอร์ budget)

## ข้อควรระวัง

- ห้ามคำนวณต้นทุนย้อนหลังใหม่จากราคาปัจจุบัน ต้องใช้ราคา ณ เวลาที่เกิด transaction เสมอ (historical cost)
- การเปลี่ยนวิธีคำนวณต้นทุน (เช่นจาก Weighted Average เป็น FIFO) เป็นการเปลี่ยนแปลงใหญ่ ต้องปรึกษาและอัปเดต `docs/business-rules.md` ก่อนทำ
