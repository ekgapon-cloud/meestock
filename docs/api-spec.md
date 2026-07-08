# API Specification — MEE Stock

> Base URL: `/api/v1`
> Auth: Bearer Token (JWT) ผ่าน header `Authorization: Bearer <token>`
> ทุก endpoint ต้อง enforce ทั้ง Role และ Data Visibility (ดู `docs/business-rules.md` ข้อ 3)

## Convention

- Request/Response เป็น JSON
- Error response format มาตรฐาน:
```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "คำอธิบาย error"
  }
}
```
- Pagination ใช้ query params: `?page=1&limit=20`

## 1. Auth

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/auth/login` | เข้าสู่ระบบ |
| POST | `/auth/logout` | ออกจากระบบ |
| GET | `/auth/me` | ดูข้อมูลผู้ใช้ปัจจุบัน + role + site access |

## 2. Material Master

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/materials` | รายการวัสดุ (filter ตาม category, search) |
| POST | `/materials` | สร้างวัสดุใหม่ (admin/storekeeper) |
| GET | `/materials/:id` | รายละเอียดวัสดุ |
| PATCH | `/materials/:id` | แก้ไขวัสดุ |
| DELETE | `/materials/:id` | ลบวัสดุ (soft delete) |

## 3. Stock Ledger / Balance

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/stock/balance` | ยอดคงเหลือ (filter ตาม siteId, materialId) |
| GET | `/stock/ledger` | ประวัติ transaction ทั้งหมด |
| POST | `/stock/receive` | บันทึกรับเข้าสต๊อก (สร้าง ledger type `RECEIVE`) |
| POST | `/stock/adjust` | ปรับปรุงสต๊อก (สร้าง ledger type `ADJUSTMENT`, ต้องมีเหตุผล) |

## 4. Material Issue Workflow

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| POST | `/issue-requests` | สร้างคำขอเบิก (status: `REQUESTED`) |
| GET | `/issue-requests` | รายการคำขอเบิก (filter ตาม status, siteId) |
| GET | `/issue-requests/:id` | รายละเอียดคำขอเบิก |
| POST | `/issue-requests/:id/approve` | อนุมัติคำขอ (status → `APPROVED`) |
| POST | `/issue-requests/:id/reject` | ปฏิเสธคำขอ (status → `REJECTED`, ต้องระบุเหตุผล) |
| POST | `/issue-requests/:id/issue` | จ่ายวัสดุจริง (status → `ISSUED`, สร้าง ledger type `ISSUE`) |

## 5. Purchase Order

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/purchase-orders` | รายการ PO |
| POST | `/purchase-orders` | สร้าง PO ใหม่ |
| GET | `/purchase-orders/:id` | รายละเอียด PO |
| PATCH | `/purchase-orders/:id/status` | เปลี่ยนสถานะ PO |

## 6. Reporting / Dashboard

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/reports/stock-value` | มูลค่าสต๊อกคงเหลือ (แยกตามไซต์/รวม) |
| GET | `/reports/issue-history` | ประวัติการเบิกจ่ายตามช่วงเวลา |
| GET | `/dashboard/executive` | ข้อมูลสรุปสำหรับ Executive Dashboard |

## 7. Access Control (Admin only)

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/users` | รายการผู้ใช้ |
| POST | `/users` | สร้างผู้ใช้ใหม่ |
| PATCH | `/users/:id/role` | เปลี่ยน role ผู้ใช้ |
| POST | `/users/:id/site-access` | กำหนดไซต์งานที่ผู้ใช้เห็นได้ |

## Error Codes มาตรฐาน (ตัวอย่าง)

| Code | ความหมาย |
|------|----------|
| `UNAUTHORIZED` | ไม่มี token หรือ token ไม่ถูกต้อง |
| `FORBIDDEN_ROLE` | Role ไม่มีสิทธิ์ทำรายการนี้ |
| `FORBIDDEN_SITE` | ไม่มีสิทธิ์เข้าถึงข้อมูลไซต์งานนี้ |
| `INSUFFICIENT_STOCK` | สต๊อกไม่พอสำหรับการเบิก |
| `INVALID_WORKFLOW_STATE` | พยายามเปลี่ยนสถานะ workflow ผิดลำดับ |

> เอกสารนี้เป็น draft เบื้องต้น ควรปรับปรุงให้ตรงกับ implementation จริงเรื่อยๆ
