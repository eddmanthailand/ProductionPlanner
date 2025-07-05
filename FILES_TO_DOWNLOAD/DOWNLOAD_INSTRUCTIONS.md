# ไฟล์สำหรับ Download และ Setup GitHub Repository

## ไฟล์ที่พร้อม Download แล้ว

ในโฟลเดอร์ `FILES_TO_DOWNLOAD` มีไฟล์สำคัญเหล่านี้:

### ไฟล์ Configuration (Root Level)
1. **package.json** - Dependencies และ scripts
2. **tsconfig.json** - TypeScript configuration
3. **vite.config.ts** - Vite build configuration
4. **drizzle.config.ts** - Database configuration
5. **tailwind.config.ts** - Tailwind CSS styling
6. **components.json** - Shadcn/ui configuration
7. **postcss.config.js** - PostCSS configuration
8. **.gitignore** - Git ignore rules (ปรับปรุงแล้ว)
9. **.env.example** - Environment variables template
10. **README.md** - Project documentation

## ขั้นตอนการ Setup

### 1. สร้าง GitHub Repository
```
Repository Name: production-planning-v2
Description: Production Planning & Accounting System with AI Integration
Private: ✓
```

### 2. Clone และคัดลอกไฟล์
```bash
# Clone repository ว่างๆ
git clone https://github.com/[YOUR_USERNAME]/production-planning-v2.git
cd production-planning-v2

# คัดลอกไฟล์จาก FILES_TO_DOWNLOAD ไปยังโฟลเดอร์ root
# (ใช้ File Explorer หรือ Finder)
```

### 3. โฟลเดอร์ที่ต้องคัดลอกแยก
คุณต้องคัดลอกโฟลเดอร์เหล่านี้จาก Replit:

#### client/ (ทั้งโฟลเดอร์)
- `client/src/` - React frontend source
- `client/index.html` - HTML entry point
- `client/public/` - Static assets

#### server/ (ทั้งโฟลเดอร์)
- `server/index.ts` - Server entry point
- `server/routes.ts` - API routes
- `server/db.ts` - Database connection
- `server/storage.ts` - Storage interface
- `server/services/` - AI และ business services
- `server/replitAuth.ts` - Authentication

#### shared/ (ทั้งโฟลเดอร์)
- `shared/schema.ts` - Database schemas

### 4. สร้าง Environment File
```bash
cp .env.example .env
# แก้ไข .env ด้วย credentials จริง
```

### 5. ติดตั้งและ Setup
```bash
# ติดตั้ง dependencies
npm install

# สร้าง Neon database ใหม่และอัปเดต DATABASE_URL

# Push database schema
npm run db:push

# Test ระบบ
npm run dev
```

## เคล็ดลับการคัดลอกไฟล์จาก Replit

### วิธี 1: Download Individual Files
1. คลิกขวาที่ไฟล์ใน Replit Files panel
2. เลือก "Download"
3. บันทึกในโฟลเดอร์ repository

### วิธี 2: Copy-Paste Content
1. เปิดไฟล์ใน Replit
2. Select All (Ctrl+A/Cmd+A)
3. Copy (Ctrl+C/Cmd+C)
4. สร้างไฟล์ใหม่ในเครื่อง
5. Paste (Ctrl+V/Cmd+V)

## โครงสร้างไฟล์ที่ควรได้หลัง Setup

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
│   ├── storage.ts
│   ├── services/
│   └── replitAuth.ts
├── shared/
│   └── schema.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── components.json
├── postcss.config.js
├── .gitignore
├── .env.example
├── .env (สร้างใหม่)
└── README.md
```

## Next Steps หลัง Clone สำเร็จ

1. **สร้าง Neon Database ใหม่**
2. **อัปเดต .env file**
3. **ทดสอบ Firebase Studio workflow**
4. **Setup GitHub Actions (optional)**
5. **Deploy ใน Replit ใหม่**

## การเชื่อมต่อ Firebase Studio

หลัง setup GitHub repo สำเร็จแล้ว สามารถ:
1. Import project ใน Firebase Studio
2. เชื่อมต่อกับ GitHub repository
3. ทดสอบ AI-powered development workflow