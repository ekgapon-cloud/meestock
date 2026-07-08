# Skill: Security & Access Control — MEE Stock

ใช้ไฟล์นี้เมื่อทำงานเกี่ยวกับ authentication, authorization, หรือความปลอดภัยของระบบ

## Two-dimensional Access Control (หัวใจของระบบ)

ระบบสิทธิ์แบ่งเป็น 2 มิติที่แยกจากกันโดยเด็ดขาด:

1. **Role (สิทธิ์การกระทำ)** — กำหนดว่า "ทำอะไรได้บ้าง" เช่น
   - `admin` — จัดการระบบทั้งหมด
   - `storekeeper` — รับเข้า/เบิกจ่าย/ปรับปรุงสต๊อก
   - `site-engineer` — สร้างคำขอเบิก
   - `approver` — อนุมัติคำขอเบิก
   - `executive` — ดู dashboard/รายงานเท่านั้น (read-only)

2. **Data Visibility (ขอบเขตข้อมูล)** — กำหนดว่า "เห็นข้อมูลไซต์งานใดบ้าง" ผ่านตาราง `UserSiteAccess`

### กฎการ Enforce

- **ทุก query ที่ดึงข้อมูลระดับ record ต้อง filter ด้วยทั้งสองมิติพร้อมกัน**
- ตัวอย่าง middleware pattern:
  ```ts
  async function enforceAccess(req: AuthenticatedRequest, requiredPermission: string) {
    if (!req.user.role.permissions.includes(requiredPermission)) {
      throw new AppError("FORBIDDEN_ROLE", "ไม่มีสิทธิ์ทำรายการนี้");
    }
  }

  async function getAccessibleSiteIds(userId: string): Promise<string[]> {
    const access = await prisma.userSiteAccess.findMany({ where: { userId } });
    return access.map((a) => a.siteId);
  }
  ```
- Admin เท่านั้นที่ bypass การ filter ตาม Data Visibility ได้

## Authentication

- ใช้ JWT สำหรับ session/API auth
- Password ต้อง hash ด้วย bcrypt (หรือ argon2) เท่านั้น ห้ามเก็บ plain text เด็ดขาด
- Token ควรมี expiry time ที่เหมาะสม (เช่น access token 15-60 นาที, refresh token แยกต่างหาก)

## Input Validation & Injection Prevention

- ใช้ Prisma ORM ซึ่งป้องกัน SQL Injection โดยธรรมชาติ (parameterized queries) — **ห้ามเขียน raw SQL ที่ interpolate string จาก user input โดยตรง**
- Validate ทุก input จาก client ด้วย schema validation (เช่น zod) ก่อนเข้าสู่ business logic

## Audit Trail

- ทุก `StockLedger` record ต้องมี `createdBy` เสมอ เพื่อ audit ว่าใครเป็นคนทำ transaction
- ทุกการอนุมัติ/ปฏิเสธคำขอเบิกต้องบันทึกผู้ดำเนินการและเวลา

## Sensitive Data

- ห้าม log ข้อมูล password, token, หรือ PII ที่ไม่จำเป็นลงใน application logs
- Environment variables (DB credentials, JWT secret) ต้องเก็บใน `.env` และไม่ commit เข้า repository (ดู `docs/deployment.md`)

## Segregation of Duties

- ผู้ขอเบิก (Requester) ต้องไม่สามารถอนุมัติคำขอของตัวเองได้ (บังคับที่ business logic layer ไม่ใช่แค่ UI)

## Checklist ก่อน merge โค้ดที่เกี่ยวกับ security

- [ ] ทุก endpoint ใหม่มีการตรวจสอบ Role
- [ ] ทุก query ที่ดึงข้อมูล site-specific มีการ filter ด้วย Data Visibility
- [ ] ไม่มี credential หรือ secret hardcode ในโค้ด
- [ ] Input validation ครบถ้วน
