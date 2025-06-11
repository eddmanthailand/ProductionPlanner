# ระบบจัดการการผลิตและบัญชี (Production Planning & Accounting System)

## ภาพรวมระบบ
ระบบ SaaS แบบ Multi-tenant สำหรับการจัดการการผลิตและบัญชี ออกแบบมาเพื่อปรับปรุงขั้นตอนการผลิตให้มีประสิทธิภาพ พร้อมด้วยความสามารถในการจัดการองค์กรขั้นสูง

## เทคโนโลยีหลัก
- **Frontend**: React.js พร้อม TypeScript และ Tailwind CSS
- **Backend**: Express.js พร้อม Node.js
- **Database**: PostgreSQL ผ่าน Neon hosting
- **UI Components**: Shadcn/ui พร้อม Radix UI
- **State Management**: TanStack Query (React Query)
- **Drag & Drop**: React Beautiful DnD
- **Forms**: React Hook Form พร้อม Zod validation

## ฟีเจอร์หลัก

### 1. การจัดการใบสั่งงาน (Work Order Management)
- สร้างและแก้ไขใบสั่งงาน
- ระบบเลขที่งานอัตโนมัติ (รูปแบบ: JB202506001)
- การจัดการ Sub-jobs แบบละเอียด
- ติดตามสถานะงานแบบเรียลไทม์

### 2. การวางแผนการผลิต (Production Planning)
- ระบบคิวงานแบบ Drag & Drop
- การวางแผนตามปฏิทินการผลิต
- จัดการกำลังการผลิตของทีม
- ระบบวันหยุดและการคำนวณเวลา

### 3. การจัดการองค์กร (Organizational Management)
- จัดการแผนก (Departments)
- จัดการทีมงาน (Teams)
- กำหนดขั้นตอนการทำงาน (Work Steps)
- จัดการพนักงาน (Employees)

### 4. การจัดการลูกค้าและสินค้า
- ระบบฐานข้อมูลลูกค้า
- จัดการข้อมูลสินค้า
- ระบบสี ไซส์ และประเภทงาน
- การตรวจสอบเลขประจำตัวผู้เสียภาษี

### 5. การจัดการคลังสินค้า
- ติดตามสต็อกสินค้า
- ระบบเคลื่อนไหวสต็อก
- รายงานสต็อกแบบเรียลไทม์

### 6. ระบบรายงานและการเงิน
- Dashboard แสดงผลแบบเรียลไทม์
- รายงานการขาย
- ติดตามธุรกรรมทางการเงิน
- ประวัติกิจกรรมของระบบ

### 7. ระบบใบเสนอราคา
- สร้างและจัดการใบเสนอราคา
- คำนวณราคาอัตโนมัติ
- ติดตามสถานะใบเสนอราคา

## โครงสร้างโปรเจค

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utility functions
│   │   └── hooks/         # Custom hooks
├── server/                # Backend Express application
│   ├── db.ts             # Database connection
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Data access layer
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema and types
└── README.md            # Documentation
```

## การติดตั้งและใช้งาน

### ข้อกำหนดระบบ
- Node.js 18+ 
- PostgreSQL database
- Git

### การติดตั้ง
1. Clone repository
```bash
git clone [repository-url]
cd [project-directory]
```

2. ติดตั้ง dependencies
```bash
npm install
```

3. ตั้งค่า environment variables
```bash
DATABASE_URL=your_postgresql_connection_string
```

4. รันการ migration
```bash
npm run db:push
```

5. เริ่มต้นระบบ
```bash
npm run dev
```

## การใช้งานหลัก

### 1. การสร้างใบสั่งงาน
1. เข้าสู่หน้า "การผลิต" > "ใบสั่งงาน"
2. กดปุ่ม "สร้างใบสั่งงานใหม่"
3. กรอกข้อมูลงาน ลูกค้า และรายละเอียดสินค้า
4. เพิ่ม Sub-jobs ตามขั้นตอนการผลิต
5. บันทึกใบสั่งงาน

### 2. การวางแผนการผลิต
1. เข้าสู่หน้า "การผลิต" > "วางแผนคิวงาน"
2. เลือกขั้นตอนการทำงาน
3. เลือกทีมงานที่รับผิดชอบ
4. กดปุ่ม "เลือกงานรอ" เพื่อเพิ่มงานเข้าคิว
5. ใช้ฟีเจอร์ Drag & Drop เพื่อจัดลำดับงาน
6. กำหนดวันเริ่มงานและคำนวณแผนการผลิต

### 3. การจัดการองค์กร
1. เข้าสู่หน้า "จัดการองค์กร"
2. จัดการแผนก ทีม และพนักงาน
3. กำหนด Work Steps สำหรับแต่ละแผนก
4. ตั้งค่ากำลังการผลิตของทีม

## ฟีเจอร์พิเศษ

### ระบบ Multi-tenant
- แยกข้อมูลตาม Tenant
- ความปลอดภัยระดับองค์กร
- การจัดการสิทธิ์ผู้ใช้

### ระบบ Drag & Drop
- จัดลำดับงานแบบลาก-วาง
- วางแผนการผลิตแบบ Visual
- อัปเดตสถานะแบบเรียลไทม์

### ระบบตรวจสอบข้อมูล
- ตรวจสอบเลขประจำตัวผู้เสียภาษี
- Validation ข้อมูลแบบ Real-time
- ป้องกันข้อผิดพลาดในการป้อนข้อมูล

## API Endpoints

### Work Orders
- `GET /api/work-orders` - ดึงรายการใบสั่งงาน
- `POST /api/work-orders` - สร้างใบสั่งงานใหม่
- `PUT /api/work-orders/:id` - อัปเดตใบสั่งงาน
- `DELETE /api/work-orders/:id` - ลบใบสั่งงาน

### Work Queue
- `GET /api/work-queues/team/:teamId` - ดึงคิวงานของทีม
- `POST /api/work-queues/add-job` - เพิ่มงานเข้าคิว
- `PUT /api/work-queues/:id` - อัปเดตคิวงาน
- `DELETE /api/work-queues/:id` - ลบงานจากคิว

### Sub-jobs
- `GET /api/sub-jobs/available/:workStepId` - ดึงงานที่พร้อมทำ
- `POST /api/sub-jobs` - สร้าง Sub-job ใหม่
- `PUT /api/sub-jobs/:id` - อัปเดต Sub-job

## การสนับสนุน
- รองรับภาษาไทยและอังกฤษ
- ระบบ Responsive Design
- รองรับการใช้งานบน Mobile และ Desktop
- ระบบ Error Handling ที่ครอบคลุม

## การพัฒนาเพิ่มเติม
- ระบบ Notification แบบเรียลไทม์
- รายงานขั้นสูงและการวิเคราะห์
- การส่งออกข้อมูลในรูปแบบต่างๆ
- ระบบ API สำหรับการเชื่อมต่อภายนอก

## ลิขสิทธิ์
© 2025 Production Planning & Accounting System. All rights reserved.