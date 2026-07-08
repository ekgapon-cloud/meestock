# Project Status — MEE Stock

> เอกสารนี้เป็น snapshot สถานะปัจจุบันของโปรเจกต์ สำหรับ tracking ความคืบหน้า
> อัปเดตทุกครั้งที่มีการเปลี่ยนเฟส เพิ่ม/เสร็จงานสำคัญ หรือเปลี่ยนทิศทาง
> อัปเดตล่าสุด: 2026-07-06

## ภาพรวม

| รายการ | รายละเอียด |
|--------|-----------|
| ชื่อโปรเจกต์ | MEE Stock (เดิม ElecStock) |
| ประเภท | ระบบบริหารสต๊อกวัสดุไฟฟ้าสำหรับงานก่อสร้าง (ledger-based) |
| Tech Stack | Next.js 14 (App Router), Node.js/Express, PostgreSQL, Prisma, TypeScript, pnpm monorepo |
| Deploy เป้าหมาย | Vercel (frontend) + Railway (backend/DB) |

## Phase Tracker

| Phase | สถานะ | ขอบเขต |
|-------|-------|--------|
| Phase 1 — MVP | 🟡 กำลังทำ | Material master, Stock receiving, Basic issue workflow |
| Phase 2 — Workflow & Ledger | 🔲 ยังไม่เริ่ม | Multi-stage approval, Ledger-based balance เต็มรูปแบบ |
| Phase 3 — Access Control | 🔲 ยังไม่เริ่ม | Two-dimensional access control (Role x Site Visibility) |
| Phase 4 — Reporting & Dashboard | 🔲 ยังไม่เริ่ม | รายงาน, Executive Dashboard |

> อัปเดตจาก `docs/changelog.md`: Phase 1 ขยับจาก 🔲 เป็น 🟡 เพราะ Prisma schema + migration แรกถูกสร้างแล้ว

## สถานะโค้ดจริง (ตรวจสอบจากไฟล์ในโปรเจกต์)

### apps/api — 🟡 เริ่มแล้วบางส่วน
- มี: `package.json`, `tsconfig.json`, `prisma.config.ts`, `.env`, `node_modules` (ติดตั้ง deps แล้ว)
- มี Prisma schema เต็มรูปแบบ (`prisma/schema.prisma`) ครอบคลุมทุก model: Material/Category/Supplier, Warehouse/Project/Customer, Employee, PurchaseOrder + Items, GoodsReceive + Items, MaterialIssue + Items, MaterialReturn, StockTransfer, StockCount, Approval, StockTransaction (ledger), ProjectCost/ProjectRevenue (Phase 2)
- มี migration แรกแล้ว: `20260706034254_init`
- ยังไม่มี: server entrypoint, routes/controllers/services — ยังไม่มีโฟลเดอร์ `src/`
- `package.json` ยังเป็น scripts placeholder (ยังไม่ได้ตั้ง `dev`/`build`/`test`)

### apps/web — 🔲 ว่างเปล่า
- Placeholder workspace เท่านั้น ยังไม่เริ่ม Next.js frontend

### packages/shared-types — 🔲 ว่างเปล่า
- Placeholder workspace เท่านั้น

### เอกสารประกอบ (docs/, skills/) — ✅ ครบตามแผน
- `docs/requirements.md`, `docs/business-rules.md`, `docs/database-schema.md` (draft เก่า), `docs/api-spec.md` (draft เก่า), `docs/deployment.md`, `docs/changelog.md`
- `skills/`: coding-standard, stock-management, site-costing, purchasing, reporting, security, testing

## สถาปัตยกรรมที่ตัดสินใจแล้ว

1. Ledger-based stock balance — `StockTransaction` เป็น source of truth เดียว ไม่มี mutable balance column
2. Multi-stage material issue workflow — `PENDING_APPROVAL → APPROVED → FULFILLED` (หรือ `REJECTED`/`PARTIALLY_FULFILLED`) ผ่าน `Approval` แบบ 1:1
3. Warehouse ผูก concept "ไซต์งาน" ผ่าน `type` (`CENTRAL|SITE|TEMPORARY`) + `projectId` แทนการมี table `Site` แยก
4. Access control สองมิติ: `Employee.role` (สิทธิ์การกระทำ) และ `Employee.accessLevel` (ปัจจุบันคุมแค่การเห็นต้นทุน) — มิติ **data visibility ต่อไซต์งานยังไม่มี table รองรับ** ต้องออกแบบเพิ่ม

## บันทึกความก้าวหน้า (Work Log)

> วันที่/เวลาดึงจาก git commit log (`.git/logs/HEAD`) และชื่อ migration folder จริง — เวลาไทย (UTC+7)

| งานที่ทำเสร็จแล้ว | วันที่เริ่ม | วันที่เสร็จ | หลักฐาน |
|---|---|---|---|
| Init monorepo structure (pnpm workspaces, root `package.json`, `docs/`, `skills/`, `CLAUDE.md`, `memory.md`) | 2026-07-06 09:51 | 2026-07-06 09:51 | git commit `657458d` "chore: init monorepo structure" |
| Cleanup stray ssh key, update `.gitignore` | 2026-07-06 09:51 | 2026-07-06 10:18 | git commit `bf82b9d` "chore: cleanup stray ssh key, update gitignore" |
| สร้าง Prisma schema เต็มรูปแบบ + migration แรก (`20260706034254_init`) | 2026-07-06 10:18 | 2026-07-06 10:52 | migration folder timestamp (10:42) + git commit `afd9e70` "feat: complete Prisma schema and initial migration" |

> โปรเจกต์เริ่มต้นและงานทั้งหมดข้างต้นเกิดขึ้นในวันเดียวกัน (2026-07-06) ภายในเวลาประมาณ 1 ชั่วโมง

## Open TODO / ประเด็นค้าง

- [ ] ยืนยันรายละเอียด role ทั้งหมด (admin, storekeeper, site-engineer ฯลฯ)
- [ ] ออกแบบ table/mechanism สำหรับ data visibility ต่อไซต์งาน (ยังไม่มีใน schema)
- [ ] กำหนด SLA/ระยะเวลาของแต่ละ stage ใน material issue workflow
- [ ] ตั้ง `dev`/`build`/`lint`/`test` scripts จริงใน `package.json` ของแต่ละ workspace
- [ ] เริ่มสร้าง server entrypoint + routes/controllers/services ใน `apps/api/src`

## Next Steps แนะนำ

1. สร้าง server entrypoint (`apps/api/src/index.ts`) และ wire `tsx watch` สำหรับ dev
2. เริ่ม implement Material master + Stock receiving (ตาม Phase 1 scope) โดยอ้างอิง `skills/stock-management.md`
3. ออกแบบ data-visibility table ก่อนเริ่ม Phase 3 เพื่อไม่ต้อง migrate schema ซ้ำซ้อนภายหลัง
