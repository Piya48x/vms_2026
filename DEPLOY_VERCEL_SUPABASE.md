# Deploy VMS: Vercel + Supabase Free + PostgreSQL Local

โครงสร้างระบบ:

1. หน้าเว็บทำงานบน Vercel
2. Supabase เก็บข้อมูลชั่วคราว รูป และส่ง Realtime
3. เครื่องบริษัทใช้ `npm run sync:cloud` ดึงข้อมูลและรูปลง PostgreSQL/`data/uploads`
4. PostgreSQL Local ไม่ต้องเปิดพอร์ต 5432 ออกอินเทอร์เน็ต

## 1. ตั้งค่า Supabase

สร้าง Supabase Project แบบ Free แล้วจดค่า:

- Project URL
- Publishable key หรือ legacy anon key
- Secret key หรือ legacy service_role key (เก็บเฉพาะเครื่องบริษัท)
- Project ref จาก URL ของ Dashboard

ติดตั้งและ Login Supabase CLI จากโฟลเดอร์โปรเจกต์:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase db push --remote
npx.cmd supabase functions deploy register-visitor --no-verify-jwt
npx.cmd supabase secrets set REPORT_ADMIN_PIN=1234 --remote=YOUR_PROJECT_REF --yes
npx.cmd supabase functions deploy report-api --no-verify-jwt --remote=YOUR_PROJECT_REF --yes
```

Supabase CLI v3 ใช้ Local stack เป็นค่าเริ่มต้น จึงต้องใส่ `--remote` เพื่อส่ง migration ขึ้น Cloud โดยไม่ต้องใช้ Docker คำสั่งนี้จะสร้างตาราง, RLS, Realtime, RPC summary และ Storage bucket `visitor-photos`

สร้างผู้ใช้หน้า Report:

1. Supabase Dashboard > Authentication > Users
2. Add user > Create new user
3. ใส่อีเมลและรหัสผ่านของผู้ดูแล

หน้า Report ป้องกัน 2 ชั้น: Supabase Authentication จะจำ session การล็อกอินไว้ ส่วน PIN จะเก็บใน Supabase Secret และต้องกรอกใหม่ทุกครั้งที่เปิดหรือรีเฟรช `/Report` ห้ามเพิ่ม `REPORT_ADMIN_PIN` ใน Vercel หรือไฟล์ frontend

## 2. ตั้งค่า Vercel

Push โปรเจกต์ขึ้น GitHub แล้ว Import repository ใน Vercel จากนั้นเพิ่ม Environment Variables:

```env
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
VITE_SUPABASE_PHOTO_BUCKET=visitor-photos
VITE_ORG_NAME=T.D.K. INDUSTRIAL
VITE_PRIVACY_NOTICE_VERSION=2026-10-30
VITE_PRIVACY_RETENTION_DAYS=90
```

ห้ามใส่ `SUPABASE_SECRET_KEY` หรือ `SUPABASE_SERVICE_ROLE_KEY` ใน Vercel หรือค่าที่ขึ้นต้นด้วย `VITE_`

Vercel ใช้ค่าจาก `vercel.json` และรัน `npm run build` อัตโนมัติ เมื่อ Deploy เสร็จให้ทดสอบ `/` และ `/Report`

## 3. เปิด Sync บนเครื่องบริษัท

เพิ่มใน `.env` ของเครื่องบริษัท:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY
SUPABASE_STORAGE_BUCKET=visitor-photos
CLOUD_SYNC_INTERVAL_SECONDS=60
```

สร้าง/อัปเดต schema แล้วทดสอบ Sync หนึ่งครั้ง:

```powershell
npm.cmd run db:init
npm.cmd run sync:once
```

ถ้าสำเร็จ เปิดตัว Sync ค้างไว้:

```powershell
npm.cmd run sync:cloud
```

ข้อมูลจะเข้า PostgreSQL ตาราง `visitors` และรูปจะอยู่ที่ `data/uploads` หากเครื่องปิด ข้อมูลจะค้างอยู่บน Supabase และ Sync ต่อเมื่อเปิดเครื่องใหม่

เครื่องใช้งานจริงตั้ง Windows Scheduled Task ชื่อ `VMS Cloud Sync` ให้เรียก `scripts/start-cloud-sync.ps1` เมื่อผู้ใช้ Login โดยสคริปต์จะเปิด Sync แบบ watch และเริ่มใหม่อัตโนมัติหากโปรเซสหยุด บันทึกสถานะไว้ที่ `logs/cloud-sync.log`

## การทดสอบก่อนใช้งานจริง

1. ลงทะเบียนจากลิงก์ Vercel พร้อมรูปหนึ่งรายการ
2. เข้า `/Report` ด้วยอีเมลผู้ดูแล จากนั้นใส่ PIN และตรวจข้อมูล
3. รีเฟรช `/Report` ต้องไม่ถามอีเมลซ้ำ แต่ต้องถาม PIN ใหม่
4. รัน `npm run sync:once`
5. ตรวจแถวใน PostgreSQL และไฟล์ใน `data/uploads`
6. ห้ามเปิด PostgreSQL port 5432 บน Router/Internet
