# ไฟล์ที่ต้องอัปโหลดใน GitHub Repository

## ไฟล์ใหม่ที่สร้างให้ระบบ Backup:

### 1. `.github/workflows/database-backup.yml`
- GitHub Actions workflow สำหรับ backup อัตโนมัติ
- รันทุกวันเวลา 09:00 น. (เวลาไทย)

### 2. `scripts/restore-backup.sh`
- Script สำหรับกู้คืนข้อมูลจาก backup
- ใช้รัน: `./scripts/restore-backup.sh backup_file.sql.gz`

### 3. `BACKUP-GUIDE.md`
- คู่มือการใช้งานระบบ backup
- รายละเอียดวิธี backup และ restore

### 4. `shared/schema.ts` (อัปเดต)
- เพิ่มตาราง authentication: roles, permissions, rolePermissions, userSessions
- อัปเดต users table เป็น roleId

## ขั้นตอนการอัปโหลด:

1. **ไปที่ repository**: https://github.com/eddmanthailand/ProductionPlanner
2. **สำหรับไฟล์ใหม่**: คลิก "Add file" > "Upload files"
3. **สำหรับไฟล์ที่มีอยู่**: คลิกที่ไฟล์ > "Edit this file" > แทนที่เนื้อหา

## หลังจากอัปโหลดแล้ว:

1. **เพิ่ม DATABASE_URL Secret**:
   - Settings > Secrets and variables > Actions
   - New repository secret: DATABASE_URL

2. **เปิดใช้งาน GitHub Actions**:
   - Actions tab > Enable workflows

3. **ทดสอบ Backup**:
   - Actions > Database Backup > Run workflow