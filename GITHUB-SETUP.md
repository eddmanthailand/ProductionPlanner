# คำแนะนำการ Push Code ไป GitHub

## ขั้นตอนที่ 1: สร้าง GitHub Repository
1. ไปที่ [GitHub.com](https://github.com)
2. คลิก **"New repository"** (ปุ่มเขียว)
3. ตั้งชื่อ repository เช่น `production-planning-app`
4. เลือก **Public** หรือ **Private**
5. **ไม่ต้อง** เลือก "Initialize with README"
6. คลิก **"Create repository"**

## ขั้นตอนที่ 2: Copy ไฟล์ทั้งหมด
1. ใน Replit, เลือกทุกไฟล์ในโปรเจคท์
2. Copy ทั้งหมด (Ctrl+A แล้ว Ctrl+C)
3. ไปที่ GitHub repository ที่สร้างใหม่
4. คลิก **"uploading an existing file"**
5. ลาก-วาง หรือ เลือกไฟล์ทั้งหมด

## ขั้นตอนที่ 3: Upload สำคัญ
อัปโหลดไฟล์เหล่านี้:
- `.github/workflows/database-backup.yml`
- `scripts/restore-backup.sh`
- `BACKUP-GUIDE.md`
- `shared/schema.ts` (ที่มี authentication tables)
- ไฟล์อื่นๆ ทั้งหมด

## ขั้นตอนที่ 4: เพิ่ม DATABASE_URL Secret
1. ใน GitHub repository, คลิก **Settings**
2. คลิก **Secrets and variables** > **Actions**
3. คลิก **"New repository secret"**
4. Name: `DATABASE_URL`
5. Value: `postgresql://...` (URL ของ Neon database)

## ขั้นตอนที่ 5: เปิดใช้งาน GitHub Actions
1. คลิกแท็บ **Actions**
2. คลิก **"I understand my workflows, go ahead and enable them"**
3. GitHub Actions จะเริ่มทำงานอัตโนมัติ

## ทดสอบ Backup
1. ไปที่ **Actions** > **Database Backup**
2. คลิก **"Run workflow"**
3. ดูผลลัพธ์ว่า backup สำเร็จ

คุณสามารถทำตามขั้นตอนเหล่านี้ได้เลย หรือถ้าต้องการความช่วยเหลือเฉพาะขั้นตอนไหน บอกมาได้