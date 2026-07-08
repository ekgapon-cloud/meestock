# MEE Stock

ระบบบริหารจัดการสต๊อกวัสดุไฟฟ้าสำหรับงานก่อสร้าง (Construction Electrical Inventory Management System)

## ภาพรวมโปรเจกต์

MEE Stock ถูกออกแบบมาเพื่อจัดการสต๊อกวัสดุอุปกรณ์ไฟฟ้าในงานก่อสร้าง ครอบคลุมตั้งแต่การรับเข้า (Receiving), การเบิกจ่าย (Material Issue), การติดตามยอดคงเหลือแบบ Ledger-based, ไปจนถึง Dashboard สำหรับผู้บริหาร

## Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Deployment (Frontend) | Vercel |
| Deployment (Backend/DB) | Railway |

## แนวคิดหลักของระบบ

1. **Ledger-based Stock Balance** — ยอดคงเหลือคำนวณจาก transaction ledger ทุกครั้ง ไม่มีการอัปเดตยอดคงเหลือแบบ mutate โดยตรง เพื่อความถูกต้องและ auditability
2. **Multi-stage Material Issue Workflow** — การเบิกวัสดุผ่านหลายขั้นตอนอนุมัติ (เช่น ขอเบิก → อนุมัติ → จ่ายจริง)
3. **Two-dimensional Access Control** — แยกสิทธิ์การใช้งาน (Role) ออกจากสิทธิ์การมองเห็นข้อมูล (Data Visibility) เช่น ผู้ใช้ role เดียวกันอาจเห็นข้อมูลคนละไซต์งานกัน

## โครงสร้างเอกสาร

- `CLAUDE.md` — คำแนะนำสำหรับ Claude Code ในการทำงานกับโปรเจกต์นี้
- `memory.md` — บันทึกความจำ/บริบทของโปรเจกต์ที่ต้องคงไว้ข้าม session
- `docs/` — เอกสารเชิงลึก (requirements, business rules, schema, API spec, deployment, changelog)
- `skills/` — แนวปฏิบัติเฉพาะด้านสำหรับแต่ละโมดูลของระบบ

## สถานะปัจจุบัน

โปรเจกต์อยู่ในช่วงพัฒนา ตาม phased tracker 33 วัน ตั้งแต่ MVP ไปจนถึง Executive Dashboard ดูรายละเอียดใน `memory.md` และ `docs/changelog.md`

## เริ่มต้นใช้งาน (Getting Started)

```bash
# ติดตั้ง dependencies
npm install

# ตั้งค่า environment variables
cp .env.example .env

# รัน Prisma migration
npx prisma migrate dev

# รัน dev server
npm run dev
```

> หมายเหตุ: รายละเอียดคำสั่งจริงอาจต้องปรับตามโครงสร้าง monorepo/โฟลเดอร์จริงของโปรเจกต์
