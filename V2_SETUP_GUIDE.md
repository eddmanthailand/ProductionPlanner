# Production Planning V2 - Replit App Setup Guide

## วิธีสร้าง Replit App ใหม่สำหรับ Version 2

### 1. สร้าง Replit App ใหม่
1. ไปที่ **Replit Dashboard** (replit.com)
2. คลิก **"Create Repl"**
3. เลือก **"Import from GitHub"**
4. ใส่ URL: `https://github.com/eddmanthailand/ProductionPlanner`
5. ตั้งชื่อ: **`production-planning-v2`**
6. คลิก **"Import"**

### 2. สร้าง GitHub Repository ใหม่ (สำหรับ V2)
1. ไปที่ **GitHub** → **New Repository**
2. **Repository Name**: `production-planning-v2`
3. **Description**: `Production Planning System V2 - Firebase Studio Enhanced`
4. **Private**: ✓
5. **Don't initialize** (เราจะ push จาก Replit)

### 3. เชื่อมต่อ V2 App กับ GitHub Repository ใหม่
ใน Replit V2 app:
1. เปิด **Shell**
2. รันคำสั่ง:
```bash
git remote set-url origin https://github.com/eddmanthailand/production-planning-v2.git
git branch -M main
git push -u origin main
```

### 4. Setup Environment Variables (V2)
ใน Replit V2 → **Secrets** 🔒:

#### Database (ใช้ Neon เดิม):
```
DATABASE_URL=postgresql://neondb_owner:***@ep-lucky-paper-a5dqiwex.us-east-2.aws.neon.tech/neondb?sslmode=require
PGHOST=ep-lucky-paper-a5dqiwex.us-east-2.aws.neon.tech
PGPORT=5432
PGUSER=neondb_owner
PGPASSWORD=***
PGDATABASE=neondb
```

#### AI & Security:
```
GEMINI_API_KEY=your-gemini-api-key
MASTER_ENCRYPTION_KEY=c712c339d375dd72506f0d5d9976e1a51788d75469628658a9002293b9abcfec
SESSION_SECRET=your-session-secret
```

#### Replit Specific:
```
NODE_ENV=development
REPL_ID=your-new-repl-id
REPLIT_DOMAINS=your-v2-domain.replit.app
```

### 5. Test V2 App
```bash
npm install
npm run db:push
npm run dev
```

### 6. Firebase Studio Integration
หลัง V2 app พร้อม:
1. ไปที่ **Firebase Studio**
2. **Import Project** จาก GitHub V2 repository
3. เชื่อมต่อ **Gemini AI** 
4. ทดสอบ **AI-powered development**

## ข้อดีของการแยก V2:

### V1 (Production Stable):
- **Replit**: `production-planning` (เดิม)
- **GitHub**: `ProductionPlanner` (เดิม)
- **Purpose**: Production stable version
- **Database**: Neon (shared)

### V2 (Development Enhanced):
- **Replit**: `production-planning-v2` (ใหม่)
- **GitHub**: `production-planning-v2` (ใหม่)
- **Purpose**: Firebase Studio testing + AI development
- **Database**: Neon (shared)

## Workflow ที่ได้:
1. **V1**: สำหรับ production ที่เสถียร
2. **V2**: สำหรับทดสอบ Firebase Studio + AI features
3. **Database**: ใช้ร่วมกัน (ประหยัดต้นทุน)
4. **Development**: AI-powered ใน Firebase Studio
5. **Deployment**: Replit V2 สำหรับ demo AI features

## Next Steps:
1. สร้าง Replit V2 app
2. สร้าง GitHub V2 repository  
3. Setup environment variables
4. ทดสอบระบบ
5. เชื่อมต่อ Firebase Studio
6. ทดสอบ AI-powered development workflow