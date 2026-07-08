# Deployment — MEE Stock

## ภาพรวม

| ส่วน | Platform |
|------|----------|
| Frontend (Next.js 14) | Vercel |
| Backend (Node.js/Express) | Railway |
| Database (PostgreSQL) | Railway |

## Environment Variables

### Frontend (Vercel)
```
API_URL=
```
> ไม่ใช้ NextAuth — auth เป็น BFF pattern เอง (ดู `CLAUDE.md` "Next.js auth gotcha") ตัว JWT เก็บใน httpOnly cookie ที่เซ็ตโดย route handler ของเราเอง ไม่มี `NEXTAUTH_SECRET`/`NEXTAUTH_URL`. `API_URL` ต้อง**ไม่มี** prefix `NEXT_PUBLIC_` เพราะ fetch เกิดฝั่ง server เท่านั้น (`lib/api.ts`)

### Backend (Railway)
```
DATABASE_URL=
JWT_SECRET=
PORT=
NODE_ENV=production
CORS_ORIGIN=
```
> `CORS_ORIGIN` ต้องตั้งเป็น origin จริงของ frontend (เช่น `https://meestock.vercel.app`) — ถ้าไม่ตั้ง โค้ดจะ reflect origin ใดก็ได้ (เหมาะกับ dev เท่านั้น ห้ามปล่อยว่างใน production)

> ห้าม commit ไฟล์ `.env` จริงเข้า repository เด็ดขาด ใช้ `.env.example` เป็น template แทน

## ขั้นตอนการ Deploy Backend (Railway)

1. เชื่อมต่อ repository กับ Railway project
2. ตั้งค่า environment variables ตามด้านบน
3. Railway จะรัน build command (เช่น `npm run build`) และ start command (เช่น `npm run start`)
4. รัน Prisma migration บน production:
   ```bash
   npx prisma migrate deploy
   ```
5. ตรวจสอบ health check endpoint (เช่น `/health`) หลัง deploy เสร็จ

## ขั้นตอนการ Deploy Frontend (Vercel)

1. เชื่อมต่อ repository กับ Vercel project
2. ตั้งค่า environment variables ตามด้านบน
3. Vercel จะ build และ deploy อัตโนมัติทุกครั้งที่ push ไปยัง branch ที่กำหนด (เช่น `main`)
4. ตรวจสอบ preview deployment ก่อน merge เข้า production branch เสมอ

## Database Migration Workflow

1. แก้ไข `schema.prisma`
2. รัน `npx prisma migrate dev --name <migration-name>` ใน local/dev environment
3. ทดสอบให้แน่ใจว่า migration ทำงานถูกต้อง
4. Commit migration files เข้า repository
5. Deploy และรัน `npx prisma migrate deploy` บน production (Railway)

## Branching Strategy (แนะนำ)

| Branch | วัตถุประสงค์ |
|--------|--------------|
| `main` | Production |
| `develop` | Staging/Integration |
| `feature/*` | Feature branches |

## Rollback Plan

- Vercel: ใช้ฟีเจอร์ "Instant Rollback" กลับไป deployment ก่อนหน้าได้ทันที
- Railway: Redeploy จาก commit ก่อนหน้า
- Database: ห้าม rollback migration บน production โดยไม่มี backup ก่อนเสมอ

## Monitoring & Logging (แนะนำให้เพิ่มเติม)

- ตั้งค่า error tracking (เช่น Sentry) สำหรับทั้ง frontend และ backend
- ตั้งค่า uptime monitoring สำหรับ backend API

> รายละเอียดจริงอาจต้องปรับตาม project setup ที่แท้จริงบน Vercel/Railway
