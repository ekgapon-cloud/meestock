# Skill: Coding Standard — MEE Stock

ใช้ไฟล์นี้ทุกครั้งที่เขียนหรือแก้ไขโค้ดในโปรเจกต์นี้

## TypeScript

- เปิด `strict: true` ใน `tsconfig.json` เสมอ
- ห้ามใช้ `any` ยกเว้นกรณีจำเป็นจริงๆ และต้อง comment อธิบายเหตุผล
- ใช้ `type`/`interface` อธิบาย shape ของข้อมูลที่ผ่าน API เสมอ (ไม่ปล่อยเป็น implicit)

## Next.js 14 (App Router)

- ใช้โครงสร้าง `app/` directory
- แยก Server Component และ Client Component ให้ชัดเจน (`"use client"` เฉพาะที่จำเป็น)
- Data fetching ฝั่ง server ให้ทำใน Server Component หรือ Route Handler ไม่ fetch จาก client โดยไม่จำเป็น
- ตั้งชื่อไฟล์ตามธรรมเนียม: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`

## Backend (Node.js/Express)

- แยก layer ชัดเจน: `routes/` → `controllers/` → `services/` → `repositories/` (Prisma calls)
- Business logic (เช่น ledger calculation, workflow state transition) ต้องอยู่ใน `services/` เท่านั้น ห้ามเขียนใน controller โดยตรง
- ทุก endpoint ต้องมี input validation (แนะนำ `zod`) ก่อนเข้าสู่ business logic

## Prisma

- `schema.prisma` คือ source of truth ของโครงสร้างฐานข้อมูล
- ทุกการเปลี่ยนแปลง schema ต้องสร้าง migration ผ่าน `prisma migrate dev` ห้ามแก้ฐานข้อมูลตรงๆ
- ใช้ Prisma transaction (`$transaction`) เมื่อมีการเขียนหลายตารางที่ต้อง atomic (เช่น การ issue วัสดุ + สร้าง ledger record)

## Naming Convention

| ประเภท | รูปแบบ | ตัวอย่าง |
|--------|--------|----------|
| ไฟล์ React component | PascalCase | `MaterialTable.tsx` |
| ไฟล์ utility/service | camelCase | `stockLedgerService.ts` |
| ตัวแปร/ฟังก์ชัน | camelCase | `calculateStockBalance()` |
| Type/Interface | PascalCase | `MaterialIssueRequest` |
| Database table/column (Prisma) | camelCase (model), snake_case ใน DB จริงถ้าตั้งค่า `@map` | |
| Enum | PascalCase | `IssueRequestStatus` |

## Error Handling

- ใช้ error class กลาง (เช่น `AppError`) พร้อม error code มาตรฐาน (ดู `docs/api-spec.md`)
- ห้าม throw string ตรงๆ หรือ swallow error โดยไม่ log

## Git Commit Convention

แนะนำใช้ [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: เพิ่มฟีเจอร์ multi-stage approval
fix: แก้บั๊กการคำนวณยอดคงเหลือ
docs: อัปเดต business rules
refactor: ปรับโครงสร้าง stock ledger service
```

## Code Review Checklist ก่อน commit

- [ ] ไม่มี `console.log` หลงเหลือใน production code
- [ ] มี input validation ครบทุก endpoint ใหม่
- [ ] ไม่มีการ mutate stock balance โดยตรง (ต้องผ่าน ledger)
- [ ] เขียน/อัปเดต test ที่เกี่ยวข้อง (ดู `skills/testing.md`)
- [ ] ตรวจสอบ Role + Data Visibility enforcement ในทุก query ใหม่
