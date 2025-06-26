# Archive Strategy สำหรับใบบันทึกประจำวันที่ลบแล้ว

## ภาพรวม

ระบบ Archive Strategy จะจัดการข้อมูล soft delete ของใบบันทึกประจำวัน (Daily Work Logs) โดยอัตโนมัติ โดยใช้ระยะเวลา 3 เดือนสำหรับการเก็บถาวรข้อมูลที่ถูกลบแล้ว

## โครงสร้างระบบ

### 1. ตารางฐานข้อมูล

#### `daily_work_logs_archive`
- เก็บข้อมูลใบบันทึกประจำวันที่ถูกลบแล้วมากกว่า 3 เดือน
- บันทึกข้อมูลเดิมและข้อมูลเพิ่มเติม:
  - `originalCreatedAt` - วันที่สร้างข้อมูลเดิม
  - `originalUpdatedAt` - วันที่แก้ไขข้อมูลเดิมครั้งสุดท้าย
  - `originalDeletedAt` - วันที่ทำ soft delete
  - `archivedAt` - วันที่ย้ายไป archive
  - `workOrderStatus` - สถานะใบสั่งงานเมื่อถูก archive

### 2. ฟังก์ชันหลัก

#### `archiveSoftDeletedLogs(workOrderId, workOrderStatus)`
- ย้ายข้อมูล soft delete ของใบสั่งงานที่ระบุไป archive table
- ลบข้อมูลจากตารางหลักแบบถาวร (permanently delete)
- คืนค่าจำนวนข้อมูลที่ถูก archive

#### `cleanupOldSoftDeletedLogs(tenantId)`
- ค้นหาใบสั่งงานที่เสร็จแล้วและมี soft delete เก่ากว่า 3 เดือน
- เรียกใช้ `archiveSoftDeletedLogs` สำหรับแต่ละใบสั่งงาน
- คืนค่าจำนวนข้อมูลทั้งหมดที่ถูก archive

#### `getDailyWorkLogsArchive(tenantId, workOrderId?)`
- ดึงข้อมูล archive ของ tenant ที่ระบุ
- สามารถกรองตามใบสั่งงานได้

## API Endpoints

### 1. Manual Archive
```
POST /api/daily-work-logs/archive/:workOrderId
Body: { workOrderStatus?: "completed" }
```
- Archive ข้อมูล soft delete ของใบสั่งงานที่ระบุ

### 2. Manual Cleanup
```
POST /api/daily-work-logs/cleanup
Body: { tenantId: string }
```
- ทำความสะอาดข้อมูล soft delete เก่ากว่า 3 เดือนสำหรับ tenant

### 3. Scheduled Cleanup
```
POST /api/daily-work-logs/scheduled-cleanup
```
- ทำความสะอาดสำหรับ tenant ทั้งหมดในระบบ
- เหมาะสำหรับ cron job

### 4. Get Archive Data
```
GET /api/daily-work-logs/archive?workOrderId=xxx
```
- ดึงข้อมูล archive

## เงื่อนไขการ Archive

1. **ใบสั่งงานต้องมีสถานะ "เสร็จแล้ว" (completed)**
2. **ข้อมูลต้องถูก soft delete มาแล้วมากกว่า 3 เดือน**
3. **เฉพาะข้อมูลที่มี `deleted_at IS NOT NULL`**

## ตัวอย่างการใช้งาน

### Automatic Cleanup (แนะนำ)
```bash
# รันทุกเที่ยงคืน (cron job)
curl -X POST https://your-app.replit.app/api/daily-work-logs/scheduled-cleanup
```

### Manual Cleanup สำหรับ Tenant เฉพาะ
```javascript
// ใน Admin Panel
const response = await fetch('/api/daily-work-logs/cleanup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tenantId: 'tenant-id' })
});
```

### Archive ใบสั่งงานเฉพาะ
```javascript
// เมื่อใบสั่งงานเสร็จสิ้น
const response = await fetch('/api/daily-work-logs/archive/wo_123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ workOrderStatus: 'completed' })
});
```

## ประโยชน์

1. **ลดขนาดฐานข้อมูล** - ข้อมูลที่ไม่ใช้งานจะถูกย้ายออก
2. **ปรับปรุงประสิทธิภาพ** - Query ทำงานเร็วขึ้นเมื่อข้อมูลน้อยลง
3. **รักษาประวัติการตรวจสอบ** - ข้อมูลยังคงอยู่ใน archive table
4. **ทำความสะอาดอัตโนมัติ** - ไม่ต้องจัดการด้วยตนเอง

## การติดตาม

ระบบจะ log ข้อมูลการทำงาน:
- จำนวนข้อมูลที่ถูก archive
- ใบสั่งงานที่ถูกประมวลผล
- เวลาที่ทำการ archive

## ข้อควรระวัง

1. **ข้อมูลที่ถูก archive แล้วจะไม่สามารถกู้คืนได้ง่าย**
2. **ควรทำ backup ก่อนรัน cleanup ครั้งแรก**
3. **ตรวจสอบสถานะใบสั่งงานให้ถูกต้องก่อน archive**

## การกู้คืนข้อมูล

หากต้องการกู้คืนข้อมูลจาก archive:
1. ดึงข้อมูลจาก `daily_work_logs_archive`
2. Insert กลับไป `daily_work_logs` (ถ้าจำเป็น)
3. อัปเดต `deleted_at = NULL` สำหรับการ restore