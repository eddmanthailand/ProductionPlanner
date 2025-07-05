# GitHub Repository Clone Guide

## โปรเจกต์: Production Planning & Accounting System
**วันที่สร้าง**: 5 กรกฎาคม 2025

## ขั้นตอนการสร้าง GitHub Repository ใหม่

### 1. สร้าง Repository ใน GitHub
```
Repository Name: production-planning-v2
Description: Production Planning & Accounting System with AI Integration
Private: ✓ (แนะนำ)
```

### 2. ไฟล์ที่ต้อง Clone (ไฟล์สำคัญ)

#### Root Files
- `package.json` - Dependencies และ scripts
- `package-lock.json` - Lock file
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS config
- `vite.config.ts` - Vite configuration
- `drizzle.config.ts` - Database configuration
- `components.json` - Shadcn/ui configuration
- `postcss.config.js` - PostCSS configuration
- `.gitignore` - Git ignore rules
- `replit.md` - Project documentation
- `README.md` - Project readme

#### Client Directory (Frontend)
- `client/src/` - ทั้งหมด
- `client/index.html`
- `client/public/` - Static assets

#### Server Directory (Backend)
- `server/` - ทั้งหมด
  - `server/index.ts` - Entry point
  - `server/routes.ts` - API routes
  - `server/db.ts` - Database connection
  - `server/storage.ts` - Storage interface
  - `server/services/` - Services (Gemini, encryption, etc.)
  - `server/replitAuth.ts` - Authentication

#### Shared Directory
- `shared/schema.ts` - Database schemas

#### Environment Files (สร้างใหม่)
- `.env.example` - Template environment variables
- `.env` - จะต้องสร้างใหม่ด้วย credentials ใหม่

### 3. ไฟล์ที่ไม่ต้อง Clone
- `node_modules/` - จะติดตั้งใหม่
- `.cache/` - Cache files
- `.upm/` - Replit specific
- `.replit` - Replit specific
- `uploads/` - User uploads
- `attached_assets/` - Development assets
- `backup.json` - Backup file
- `test-file.txt` - Test files
- `cookies.txt` - Test cookies
- เอกสาร .md อื่นๆ (เฉพาะ replit.md และ README.md)

### 4. การตั้งค่า Environment Variables ใหม่
```env
# Database
DATABASE_URL=<NEW_NEON_DATABASE_URL>

# Encryption
MASTER_ENCRYPTION_KEY=<SAME_KEY_OR_NEW>

# Gemini AI
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# Session
SESSION_SECRET=<NEW_RANDOM_SECRET>

# Auth (if using Replit Auth)
REPL_ID=<NEW_REPL_ID>
REPLIT_DOMAINS=<NEW_DOMAIN>
ISSUER_URL=https://replit.com/oidc
```

### 5. ขั้นตอนหลัง Clone
1. สร้าง Neon Database ใหม่
2. รัน `npm install`
3. สร้าง `.env` file ใหม่
4. รัน `npm run db:push` เพื่อสร้างตาราง
5. ทดสอบระบบ

## คำแนะนำพิเศษ
- ใช้ GitHub Desktop หรือ command line ในเครื่องคุณ
- อย่าลืมตั้งค่า secrets ใหม่ใน Replit หรือ Firebase Studio
- ทดสอบการเชื่อมต่อฐานข้อมูลก่อน deploy

## Hybrid Workflow ที่แนะนำ
```
Firebase Studio → GitHub → Replit/Firebase Studio → Deploy
```

## ขนาดโปรเจกต์ประมาณ
- ไฟล์ source code: ~50MB
- ไฟล์ทั้งหมด (รวม node_modules): ~200MB
- ไฟล์ที่ต้อง clone: ~5MB