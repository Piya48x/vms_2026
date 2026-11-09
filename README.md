# VMS Local — PostgreSQL + Express + Socket.IO

ระบบ Visitor Management ที่ทำงานโดยไม่ใช้ Supabase และไม่มีค่า license:

- PostgreSQL เก็บข้อมูลผู้มาติดต่อ
- Express REST API
- Socket.IO อัปเดต Dashboard แบบ Realtime
- รูปเก็บใน `data/uploads` บนเครื่อง Server
- React/Vite Frontend
- Docker Compose สำหรับติดตั้งและเปิดใช้งานทั้งระบบ

## วิธีติดตั้งที่แนะนำสำหรับ Windows

### โปรแกรมที่ต้องติดตั้ง

1. Docker Desktop: https://www.docker.com/products/docker-desktop/
2. เปิด WSL 2 ตามขั้นตอนของ Docker Desktop
3. Restart Windows หลังติดตั้ง

ไม่ต้องติดตั้ง PostgreSQL หรือ Node.js แยก หากใช้งานผ่าน Docker

### ตั้งค่าครั้งแรก

เปิด PowerShell ในโฟลเดอร์โปรเจกต์:

```powershell
Copy-Item .env.example .env
notepad .env
```

ต้องเปลี่ยนอย่างน้อยสามค่านี้:

```env
POSTGRES_PASSWORD=รหัสฐานข้อมูลที่คาดเดายาก
ADMIN_PASSWORD=รหัสเข้าหน้า Report
SESSION_SECRET=ข้อความสุ่มยาวอย่างน้อย 32 ตัวอักษร
```

ถ้า `.env` เดิมยังมีค่า Supabase และต้องการย้ายข้อมูลเก่า ให้เปลี่ยนชื่อไฟล์เดิมเป็น
`.env.supabase-migration` ก่อนสร้าง `.env` ใหม่ และดูหัวข้อ “ย้ายข้อมูลจาก Supabase”

### เปิดระบบ

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

หรือ:

```powershell
docker compose up -d --build
```

เปิดเว็บที่ http://localhost:3000

- หน้าลงทะเบียน: `/`
- Dashboard/Report: `/Report`
- Health check: `/api/health`

### ปิดระบบ

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop.ps1
```

คำสั่งนี้หยุด Container แต่ไม่ลบข้อมูล PostgreSQL และรูป

## ข้อมูลเก็บอยู่ที่ไหน

- PostgreSQL: Docker-managed volume (ดูชื่อจริงด้วย `docker volume ls`)
- รูป: `data/uploads`
- Schema: `database/schema.sql`

ห้ามใช้ `docker compose down -v` หากไม่ต้องการลบฐานข้อมูล

## สำรองข้อมูล

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup.ps1
```

ไฟล์จะอยู่ใน `backups/` และมีทั้ง SQL กับสำเนาโฟลเดอร์รูป แนะนำตั้ง Windows Task Scheduler ให้รันทุกคืนและคัดลอก `backups` ไป NAS หรือ External disk

กู้คืนฐานข้อมูล:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore.ps1 -BackupFile .\backups\vms_YYYYMMDD_HHMMSS.sql
```

การกู้คืนรูป ให้คัดลอกโฟลเดอร์ `photos_...` กลับไปที่ `data/uploads`

## ย้ายข้อมูลจาก Supabase

สคริปต์ import จะย้ายทั้งข้อมูล visitor และดาวน์โหลดรูปมาไว้ในเครื่อง

1. ใน `.env` เพิ่มค่าจากโปรเจกต์ Supabase เดิม:

```env
MIGRATION_SUPABASE_URL=https://PROJECT.supabase.co
MIGRATION_SUPABASE_ANON_KEY=ค่าเดิมจาก VITE_SUPABASE_ANON_KEY
```

2. เปิดระบบด้วย `docker compose up -d --build`
3. สั่ง import ภายใน Container (ไม่ต้องติดตั้ง Node.js เพิ่ม):

```powershell
docker compose exec app node scripts/import-supabase.mjs
```

4. ตรวจจำนวนข้อมูลและรูปในระบบ Local ก่อนยกเลิก Supabase
5. ลบ `MIGRATION_SUPABASE_URL` และ `MIGRATION_SUPABASE_ANON_KEY` หลังย้ายสำเร็จ แล้วสั่ง `docker compose up -d --force-recreate app`

สคริปต์ import ใช้ `id` เดิมและสามารถรันซ้ำได้ แต่ข้อมูล Local ที่มี `id` ซ้ำจะถูกอัปเดตด้วยข้อมูลจาก Supabase จึงควร import ก่อนเริ่มใช้งาน Local จริง

## ใช้งานแบบไม่ใช้ Docker (สำหรับพัฒนา)

ต้องติดตั้ง:

- Node.js 20+
- PostgreSQL 15+

สร้างฐานข้อมูล/user ตาม `DATABASE_URL` ใน `.env` แล้วสั่ง:

```powershell
npm.cmd install
npm.cmd run db:init
npm.cmd run dev
```

- Frontend development: http://localhost:3000
- API development: http://localhost:3001

Vite จะ proxy `/api` และ `/socket.io` ไป Backend ให้อัตโนมัติ

## ใช้งาน Local แบบไม่ใช้ Docker (แนะนำสำหรับเครื่องนี้)

เมื่อติดตั้ง PostgreSQL และสร้างฐานข้อมูล `vms` แล้ว ให้ตั้งค่า `.env`:

```env
POSTGRES_DB=vms
POSTGRES_USER=postgres
POSTGRES_PASSWORD=รหัสผ่านตอนติดตั้ง PostgreSQL
PGHOST=localhost
PGPORT=5432
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=เปลี่ยนเป็นรหัสหน้า Report
SESSION_SECRET=ข้อความสุ่มยาวอย่างน้อย32ตัวอักษร
```

สร้างตารางและ build ครั้งแรก:

```powershell
npm.cmd install
npm.cmd run db:init
npm.cmd run build
```

เปิดระบบ:

```powershell
npm.cmd start
```

จากนั้นเปิด http://localhost:3000 และเปิดหน้าต่าง PowerShell นี้ค้างไว้ หากต้องการหยุดให้กด `Ctrl+C`

## การใช้งานจากเครื่องอื่นใน LAN

เปิด Firewall TCP port 3000 เฉพาะ Private network แล้วเข้า:

```text
http://IP-เครื่อง-Server:3000
```

ข้อควรระวัง: Browser อนุญาตกล้องบน `localhost` หรือ HTTPS เป็นหลัก หากเปิดด้วย IP ผ่าน HTTP กล้องอาจใช้งานไม่ได้ ควรตั้ง HTTPS ด้วย reverse proxy เช่น Caddy/Nginx หรือใช้ใบรับรองภายในองค์กร

หากเปิดผ่านอินเทอร์เน็ต ต้องใช้ HTTPS, Firewall และห้ามเปิด PostgreSQL port 5432 สู่ Internet โดยตรง ใน Compose นี้ port 5432 ถูก bind เฉพาะ `127.0.0.1` แล้ว

เมื่อใช้ HTTPS ให้ตั้ง:

```env
COOKIE_SECURE=true
```

## Retention / PDPA

ค่าเริ่มต้นไม่ลบข้อมูลอัตโนมัติ:

```env
RETENTION_DAYS=0
```

หลังบริษัทอนุมัติระยะเวลา เช่น 90 วัน ให้เปลี่ยนเป็น:

```env
RETENTION_DAYS=90
```

แล้วสั่ง `docker compose up -d --force-recreate app` ระบบจะตรวจและลบข้อมูลพร้อมรูปที่หมดอายุวันละครั้ง ควรสำรองข้อมูลและยืนยันนโยบายก่อนเปิดใช้

## คำสั่งดูสถานะและ Log

```powershell
docker compose ps
docker compose logs -f app
docker compose logs -f db
```

ตรวจฐานข้อมูลผ่าน command line:

```powershell
docker compose exec db psql -U vms -d vms
```

## Security

- รหัสหน้า Report ตรวจที่ Backend และเก็บ session ใน HttpOnly cookie
- API อ่าน/แก้ไข/ลบข้อมูลและดูรูปต้องล็อกอิน
- หน้าลงทะเบียนเปิดเฉพาะ API เพิ่ม visitor
- รูปไม่ถูกเปิดเป็น public static folder
- เปลี่ยน `ADMIN_PASSWORD`, `POSTGRES_PASSWORD` และ `SESSION_SECRET` ก่อนใช้งานจริง
- สำรองข้อมูลออกจากเครื่อง Server เป็นประจำ
