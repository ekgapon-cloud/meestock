# Skill: Reporting — MEE Stock

ใช้ไฟล์นี้เมื่อทำงานเกี่ยวกับรายงานหรือ Dashboard

## หลักการทั่วไป

- รายงานทุกตัวต้อง enforce Data Visibility ตามผู้ใช้ที่ล็อกอิน (เห็นเฉพาะไซต์งานที่มีสิทธิ์ ยกเว้น Admin/Executive ที่เห็นภาพรวมทั้งหมด)
- คำนวณจาก `StockLedger` เป็นหลัก ไม่ query จาก cached table โดยตรงถ้าต้องการความแม่นยำสูงสุด (cached table ใช้เพื่อ performance ในหน้าที่ไม่ critical)

## รายงานหลักที่ต้องรองรับ

### 1. รายงานยอดคงเหลือ (Stock Balance Report)
- แสดงยอดคงเหลือปัจจุบันของทุกวัสดุ แยกตามไซต์งาน
- Filter: siteId, category, ต่ำกว่า reorderPoint

### 2. รายงานประวัติการเคลื่อนไหวสต๊อก (Stock Movement Report)
- แสดงทุก transaction ใน `StockLedger` ในช่วงเวลาที่กำหนด
- Filter: siteId, materialId, transaction type, ช่วงวันที่

### 3. รายงานมูลค่าสต๊อก (Stock Valuation Report)
- คำนวณจากยอดคงเหลือ × avgCost ปัจจุบัน (ดู `skills/site-costing.md`)

### 4. รายงานการเบิกจ่าย (Material Issue Report)
- แสดงคำขอเบิกทั้งหมด พร้อมสถานะ (REQUESTED/APPROVED/ISSUED/REJECTED)
- Filter: siteId, requestedBy, ช่วงวันที่

### 5. Executive Dashboard
- ภาพรวมมูลค่าสต๊อกทุกไซต์งาน
- แนวโน้มการเบิกจ่ายรายเดือน (trend chart)
- Top วัสดุที่เบิกจ่ายมากที่สุด
- ไซต์งานที่มีต้นทุนวัสดุสูงที่สุด
- รายการวัสดุที่ต่ำกว่า reorder point (ต้องสั่งซื้อเพิ่ม)

## แนวทางด้าน Performance

- รายงานที่ query ข้อมูลจำนวนมาก (เช่น movement report ทั้งปี) ควรพิจารณา pagination หรือ aggregate query ที่ database level แทนการดึงทุก record มาคำนวณที่ application layer
- Dashboard ที่ต้องอัปเดตบ่อย ควรพิจารณา cached/materialized view ที่ refresh เป็นระยะ (เช่นทุก 5-15 นาที) แทนการ query สดทุกครั้ง หากข้อมูล real-time ไม่จำเป็นขนาดนั้น

## รูปแบบการแสดงผล

- ใช้หน่วยเงินบาท (฿) และรูปแบบตัวเลขแบบไทย (คั่นหลักพันด้วย comma)
- วันที่แสดงผลเป็นรูปแบบไทยหรือ ISO ตามที่ตกลงกับผู้ใช้งาน (ควรระบุให้ชัดเจนใน UI)
