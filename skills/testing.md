# Skill: Testing — MEE Stock

ใช้ไฟล์นี้เมื่อเขียนหรือรัน test สำหรับโปรเจกต์นี้

## แนวทาง Testing โดยรวม

| ระดับ | เครื่องมือแนะนำ | ขอบเขต |
|-------|-----------------|--------|
| Unit Test | Jest / Vitest | Business logic ล้วนๆ เช่น การคำนวณ stock balance, weighted average cost |
| Integration Test | Jest + Prisma (test database) | API endpoints, workflow state transitions |
| E2E Test | Playwright / Cypress | User flow สำคัญ เช่น สร้างคำขอเบิก → อนุมัติ → จ่ายวัสดุ |

## จุดที่ต้องมี Test Coverage สูง (Critical Paths)

1. **การคำนวณยอดคงเหลือจาก ledger** — ทดสอบว่า SUM(quantity) ให้ผลลัพธ์ถูกต้องในทุกกรณี (RECEIVE, ISSUE, ADJUSTMENT, TRANSFER)
2. **Multi-stage Issue Workflow** — ทดสอบว่าไม่สามารถ skip สถานะได้ (เช่น REQUESTED → ISSUED โดยตรงต้อง fail)
3. **Two-dimensional Access Control** — ทดสอบว่า user ที่ไม่มีสิทธิ์เห็นไซต์งาน A จะไม่เห็นข้อมูลของไซต์งาน A ในทุก endpoint
4. **Insufficient Stock Prevention** — ทดสอบว่าไม่สามารถ issue เกินยอดคงเหลือได้ (เว้นแต่เปิด backorder)
5. **Weighted Average Cost Calculation** — ทดสอบการคำนวณต้นทุนเฉลี่ยเมื่อรับเข้าหลายครั้งด้วยราคาต่างกัน

## ตัวอย่างโครงสร้าง Test (Unit)

```ts
describe("StockLedgerService", () => {
  it("คำนวณยอดคงเหลือถูกต้องจากหลาย transaction", async () => {
    // arrange: seed RECEIVE +100, ISSUE -30, ADJUSTMENT -5
    // act: call getStockBalance(materialId, siteId)
    // assert: ผลลัพธ์ = 65
  });

  it("ปฏิเสธการ issue เมื่อสต๊อกไม่พอ", async () => {
    // arrange: balance = 10
    // act & assert: issueMaterial(qty: 20) ต้อง throw INSUFFICIENT_STOCK
  });
});
```

## Test Database

- ใช้ PostgreSQL แยก instance/schema สำหรับ test (ห้ามใช้ database จริงในการรัน test)
- รัน migration ก่อนแต่ละ test suite และ reset ข้อมูลระหว่าง test เพื่อไม่ให้ test ปนกัน
- แนะนำใช้ Docker container สำหรับ test database เพื่อความ consistent

## CI/CD

- ทุก Pull Request ควรรัน test suite อัตโนมัติก่อน merge
- Test ที่เกี่ยวกับ business logic สำคัญ (ledger, workflow, access control) ต้องผ่าน 100% ก่อน merge เข้า `main`

## Checklist ก่อน commit โค้ดใหม่

- [ ] เขียน unit test สำหรับ business logic ใหม่ทุกครั้ง
- [ ] เขียน integration test สำหรับ API endpoint ใหม่
- [ ] รัน test suite ทั้งหมดผ่านก่อน commit
- [ ] ถ้าแก้ business logic ที่กระทบ ledger/workflow ต้องอัปเดต test เดิมที่เกี่ยวข้องด้วย
