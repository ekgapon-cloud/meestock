# Database Schema — MEE Stock

> ใช้ PostgreSQL + Prisma ORM เป็น source of truth ของ schema (`schema.prisma`)
> เอกสารนี้เป็นสรุปแนวคิดโครงสร้างหลัก ควรตรวจสอบกับ `schema.prisma` จริงในโค้ดเสมอ

## แนวคิดหลัก

- ยอดคงเหลือ (Stock Balance) เป็น **derived value** จาก `StockLedger` ไม่มีการเก็บยอดคงเหลือแบบ mutable โดยตรง (อาจมี materialized/cached table เพื่อ performance แต่ต้องมี mechanism sync กับ ledger เสมอ)
- แยกตาราง Role และ Data Visibility (Site Access) ออกจากกัน

## ตารางหลัก (Core Tables)

### User
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| name | String | |
| email | String | Unique |
| passwordHash | String | |
| roleId | String (FK) | อ้างอิง Role |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Role
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| name | String | เช่น admin, storekeeper, site-engineer |
| permissions | Json / relation | รายการสิทธิ์การกระทำ |

### Site (ไซต์งาน)
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| name | String | ชื่อไซต์งาน |
| code | String | รหัสไซต์งาน |
| status | String | active / closed |

### UserSiteAccess (Data Visibility — มิติที่ 2)
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| userId | String (FK) | |
| siteId | String (FK) | |

### Material (วัสดุ)
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| sku | String | Unique |
| name | String | |
| unit | String | หน่วยนับ |
| category | String | |
| reorderPoint | Decimal | จุดสั่งซื้อขั้นต่ำ (ต่อไซต์ อาจแยกตาราง) |

### StockLedger (หัวใจของระบบ)
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| materialId | String (FK) | |
| siteId | String (FK) | |
| type | Enum | RECEIVE / ISSUE / ADJUSTMENT / RETURN / TRANSFER |
| quantity | Decimal | ค่าบวก/ลบตาม type |
| referenceType | String | เช่น PO, MaterialIssueRequest |
| referenceId | String | |
| createdBy | String (FK -> User) | |
| createdAt | DateTime | |

### MaterialIssueRequest (Multi-stage Workflow)
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| siteId | String (FK) | |
| requestedBy | String (FK -> User) | |
| status | Enum | REQUESTED / APPROVED / REJECTED / ISSUED |
| approvedBy | String (FK -> User, nullable) | |
| issuedBy | String (FK -> User, nullable) | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### MaterialIssueRequestItem
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| requestId | String (FK) | |
| materialId | String (FK) | |
| quantityRequested | Decimal | |
| quantityIssued | Decimal | อาจน้อยกว่าที่ขอ |

### PurchaseOrder (PO)
| Field | Type | หมายเหตุ |
|-------|------|----------|
| id | String (uuid) | Primary key |
| siteId | String (FK) | |
| supplierId | String (FK) | |
| status | Enum | DRAFT / ORDERED / RECEIVED / CANCELLED |
| createdAt | DateTime | |

## ความสัมพันธ์หลัก (Relationships)

- `User` 1—1 `Role`
- `User` 1—N `UserSiteAccess` N—1 `Site` (many-to-many ผ่าน junction table)
- `StockLedger` N—1 `Material`, N—1 `Site`
- `MaterialIssueRequest` 1—N `MaterialIssueRequestItem`
- `MaterialIssueRequest` (เมื่อ issued) → สร้าง `StockLedger` records ประเภท `ISSUE`

## หมายเหตุสำคัญ

- ยอด `quantity` ใน `StockLedger` ควรจะ signed (บวก = เข้า, ลบ = ออก) เพื่อให้ `SUM(quantity)` ได้ยอดคงเหลือโดยตรง
- ควรพิจารณาทำ materialized view หรือ cached balance table เพื่อ performance แต่ต้อง sync กับ ledger เสมอ (ห้ามเป็น source of truth เอง)
- Schema ฉบับเต็มต้องยืนยันและ maintain ผ่าน `schema.prisma` ไฟล์นี้เป็นเพียงเอกสารสรุปแนวคิด
