# Changelog — MEE Stock

รูปแบบอ้างอิงจาก [Keep a Changelog](https://keepachangelog.com/) — เรียงจากล่าสุดไปเก่าสุด

## [Unreleased]

### เปลี่ยนชื่อโปรเจกต์
- เปลี่ยนชื่อโปรเจกต์จาก **ElecStock** เป็น **MEE Stock**

### เพิ่ม (Added)
- โครงสร้างเอกสารเริ่มต้นของโปรเจกต์ (README, CLAUDE.md, memory.md, docs/, skills/)
- Backend (`apps/api`): auth, materials+categories CRUD, stock ledger, material issue workflow, PO+goods receive, reporting/dashboard, cost-visibility redaction, access control admin — ครบตาม Phase 1-4 พร้อม automated tests (Vitest 20/20 ผ่าน)
- Frontend (`apps/web`): เริ่มแล้ว — login (BFF httpOnly cookie), protected layout, `/dashboard`, `/materials` (list/search/pagination/deactivate/create)
- `packages/shared-types`: type-only DTO package (ยังไม่ได้ผูกเข้า `apps/api`)

## Phase Tracker (สรุป 33 วัน)

| Phase | สถานะ | ขอบเขต |
|-------|-------|--------|
| Phase 1 — MVP | ✅ เสร็จแล้ว (backend) / 🟡 กำลังทำ (frontend) | Material master, Stock receiving, Basic issue workflow |
| Phase 2 — Workflow & Ledger | ✅ เสร็จแล้ว (backend) / 🔲 ยังไม่เริ่ม (frontend) | Multi-stage approval, Ledger-based balance เต็มรูปแบบ, PO+Goods Receive |
| Phase 3 — Access Control | ✅ เสร็จแล้ว (backend) / 🔲 ยังไม่เริ่ม (frontend UI) | Two-dimensional access control (Role x Site Visibility) |
| Phase 4 — Reporting & Dashboard | ✅ เสร็จแล้ว (backend) / 🟡 กำลังทำ (frontend, เฉพาะ executive dashboard) | รายงาน, Executive Dashboard |

> สถานะล่าสุด: 2026-07-07 — Backend ครบ 4 phase แล้ว (ดูรายละเอียดใน `memory.md`), Frontend ยังอยู่ระหว่างพอร์ตหน้าจอที่เหลือ (material issue workflow, PO/goods receive, reports อื่น, access control admin UI)
> อัปเดตสถานะ (🔲 ยังไม่เริ่ม / 🟡 กำลังทำ / ✅ เสร็จแล้ว) เมื่อมีความคืบหน้า

## แนวทางการเขียน Entry ใหม่

```
## [วันที่ หรือ เวอร์ชัน]

### เพิ่ม (Added)
- ...

### แก้ไข (Changed)
- ...

### แก้บั๊ก (Fixed)
- ...

### ลบ (Removed)
- ...
```
