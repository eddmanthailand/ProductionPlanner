# คู่มือการใช้งาน Database Backup System

## ระบบ Backup อัตโนมัติ

### 1. Neon Console Backup (ปัจจุบัน)
- **Point-in-Time Recovery**: 1 วัน
- **ทำงานอัตโนมัติ**: ทุกชั่วโมง
- **ไม่ต้องตั้งค่าเพิ่ม**: พร้อมใช้งาน

### 2. GitHub Actions Backup (30 วัน)
- **รันอัตโนมัติ**: ทุกวันเวลา 09:00 น. (เวลาไทย)
- **เก็บไฟล์**: 30 วัน
- **บีบอัดไฟล์**: ประหยัดพื้นที่

## การตั้งค่า GitHub Actions

### ขั้นตอนที่ 1: เพิ่ม Secret
1. ไปที่ GitHub repository
2. คลิก **Settings** > **Secrets and variables** > **Actions**
3. คลิก **New repository secret**
4. เพิ่ม secret:
   - **Name**: `DATABASE_URL`
   - **Value**: URL ของ Neon database

### ขั้นตอนที่ 2: เปิดใช้งาน Workflow
1. ไปที่แท็บ **Actions** ใน GitHub
2. คลิก **I understand my workflows, go ahead and enable them**
3. Workflow จะรันอัตโนมัติทุกวัน

### ขั้นตอนที่ 3: ทดสอบ Backup (ไม่บังคับ)
1. คลิก **Actions** > **Database Backup**
2. คลิก **Run workflow** > **Run workflow**
3. รอสักครู่แล้วดูผลลัพธ์

## การกู้คืนข้อมูล

### จาก Neon Console
1. ไปที่ Neon Console
2. เลือก **Instant restore**
3. เลือกเวลาที่ต้องการกู้คืน (ภายใน 1 วัน)
4. คลิก **Restore**

### จาก GitHub Actions Backup
1. ดาวน์โหลดไฟล์ backup จาก GitHub Actions
2. รันคำสั่ง:
```bash
export DATABASE_URL="your_database_url"
./scripts/restore-backup.sh backups/backup_20250616_020000.sql.gz
```

## ตัวอย่างการใช้งาน

### รันคำสั่ง Backup ด้วยตนเอง
```bash
# ดาวน์โหลดไฟล์ backup ล่าสุด
gh run download --name database-backup-123

# กู้คืนข้อมูล
export DATABASE_URL="postgresql://user:pass@host:5432/db"
./scripts/restore-backup.sh backup_20250616_020000.sql.gz
```

### ตรวจสอบสถานะ Backup
- **Neon Console**: ดูใน Instant restore section
- **GitHub Actions**: ดูใน Actions tab

## ข้อแนะนำ

### ความปลอดภัย
- ไม่เผยแพร่ DATABASE_URL ใน code
- ใช้ GitHub Secrets เท่านั้น
- ตรวจสอบ backup เป็นประจำ

### การบำรุงรักษา
- ตรวจสอบว่า GitHub Actions ทำงานปกติ
- ทดสอบการ restore อย่างน้อยเดือนละครั้ง
- ลบไฟล์ backup เก่าที่ไม่ใช้แล้ว

### ปัญหาที่อาจเกิดขึ้น
- **GitHub Actions ไม่ทำงาน**: ตรวจสอบ DATABASE_URL secret
- **ไฟล์ backup ใหญ่**: GitHub มีขนาดจำกัด 2GB
- **Restore ใช้เวลานาน**: ขึ้นอยู่กับขนาดข้อมูล

## สรุป

ตอนนี้คุณมีระบบ backup แบบ **hybrid**:
- **Neon**: สำหรับกู้คืนระยะสั้น (1 วัน)
- **GitHub Actions**: สำหรับกู้คืนระยะยาว (30 วัน)

ทั้งสองระบบทำงานอัตโนมัติ ไม่ต้องดูแลเพิ่มเติม