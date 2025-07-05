# ขั้นตอนการ Clone Repository แบบละเอียด

## 1. สร้าง GitHub Repository
1. เข้า https://github.com
2. คลิก "New repository" (ปุ่มเขียว)
3. ตั้งชื่อ: `production-planning-v2`
4. เลือก Private
5. **อย่าเลือก** "Add a README file"
6. คลิก "Create repository"

## 2. Clone ลงเครื่องคุณ

### วิธีที่ 1: ใช้ Command Line
```bash
# เปิด Terminal/Command Prompt
cd Desktop (หรือโฟลเดอร์ที่ต้องการ)
git clone https://github.com/[YOUR_USERNAME]/production-planning-v2.git
cd production-planning-v2
```

### วิธีที่ 2: ใช้ GitHub Desktop
1. ดาวน์โหลด GitHub Desktop
2. เข้าสู่ระบบ GitHub
3. คลิก "Clone a repository from the Internet"
4. เลือก repository ที่สร้างใหม่
5. เลือกโฟลเดอร์ที่ต้องการเก็บ

## 3. คัดลอกไฟล์จาก Replit

### ไฟล์ที่อยู่ใน Root Directory (โฟลเดอร์หลัก)
ไฟล์เหล่านี้อยู่ในโฟลเดอร์เดียวกับที่คุณเห็น replit.md:

**ไฟล์สำคัญที่ต้องคัดลอก:**
- `package.json`
- `package-lock.json` 
- `tsconfig.json`
- `tailwind.config.ts`
- `vite.config.ts`
- `drizzle.config.ts`
- `components.json`
- `postcss.config.js`
- `.gitignore`
- `replit.md`
- `README.md`
- `.env.example` (ไฟล์ที่เพิ่งสร้าง)

### ไฟล์ที่อยู่ในโฟลเดอร์ย่อย
**client/** - คัดลอกทั้งโฟลเดอร์
**server/** - คัดลอกทั้งโฟลเดอร์  
**shared/** - คัดลอกทั้งโฟลเดอร์

### วิธีคัดลอกไฟล์

#### วิธีที่ 1: Download จาก Replit
1. ใน Replit ไปที่ Files panel (แถบซ้าย)
2. คลิกขวาที่ไฟล์ → Download
3. บันทึกลงโฟลเดอร์ repository ที่ clone มา

#### วิธีที่ 2: Copy-Paste Code
1. เปิดไฟล์ใน Replit
2. Copy โค้ดทั้งหมด (Ctrl+A, Ctrl+C)
3. สร้างไฟล์ใหม่ในเครื่อง
4. Paste โค้ด (Ctrl+V)

## 4. โครงสร้างโฟลเดอร์ที่ควรได้
```
production-planning-v2/
├── client/
│   ├── src/
│   ├── index.html
│   └── public/
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── db.ts
│   └── services/
├── shared/
│   └── schema.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 5. หลังคัดลอกเสร็จ
```bash
# สร้าง .env จาก template
cp .env.example .env

# ติดตั้ง dependencies
npm install

# Push ขึ้น GitHub
git add .
git commit -m "Initial commit: Clone from Replit"
git push origin main
```

## การเข้าถึงไฟล์ใน Replit
- คลิกที่ไฟล์ในแถบซ้าย (Files panel)
- หรือใช้ที่อยู่: `https://replit.com/@[YOUR_USERNAME]/[REPL_NAME]`
- ดูไฟล์ใน browser แล้ว copy content