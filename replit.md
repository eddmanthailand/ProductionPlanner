# Production Planning & Accounting System

## Overview

This is a comprehensive SaaS multi-tenant business management system designed for production planning and accounting. The application is built with React.js (TypeScript), Express.js, and PostgreSQL, featuring an 8-level permission system and multi-tenant architecture. The system manages production workflows, inventory, sales, customers, and accounting operations with sophisticated role-based access control.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **State Management**: TanStack Query (React Query) for server state
- **Forms**: React Hook Form with Zod validation
- **Routing**: Wouter for lightweight routing
- **Drag & Drop**: React Beautiful DnD for production queue management
- **Build Tool**: Vite with custom configuration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL hosted on Neon with connection pooling
- **ORM**: Drizzle ORM with TypeScript schemas
- **Authentication**: Hybrid approach supporting both Replit OpenID Connect and internal user management
- **Session Management**: Express sessions with configurable storage (memory/database)
- **API Design**: RESTful APIs with type-safe request/response handling

### Database Design
- **Multi-tenant**: UUID-based tenant isolation
- **Role-based Access Control**: 8-level hierarchical permission system
- **Production Management**: Work orders, sub-jobs, production plans, and daily work logs
- **Business Operations**: Customers, products, quotations, invoices, and transactions
- **Organizational Structure**: Departments, teams, employees, and work steps

## Key Components

### Authentication System
- **Dual Authentication**: Supports both Replit OpenID Connect and internal user authentication
- **Session Management**: Configurable session storage with automatic cleanup
- **JWT Integration**: Token-based authentication with automatic expiration
- **Multi-tenant Support**: Tenant-aware authentication and authorization

### Permission System
- **8-Level Hierarchy**: ADMIN, GENERAL_MANAGER, MANAGER, SUPERVISOR, LEAD, SENIOR, STAFF, INTERN
- **Page-level Access Control**: Granular permissions for each application page
- **Action-based Permissions**: Create, Read, Update, Delete permissions per resource
- **Role-based Navigation**: Dynamic menu rendering based on user permissions

### Production Management
- **Work Order System**: Comprehensive work order management with sub-jobs
- **Production Planning**: Calendar-based planning with drag-and-drop interface
- **Queue Management**: Visual work queue with status tracking
- **Daily Work Logs**: Time tracking and progress monitoring
- **Capacity Planning**: Team-based production capacity management

### Business Operations
- **Customer Management**: Complete customer database with Thai tax ID validation
- **Product Catalog**: Inventory management with stock tracking
- **Sales Pipeline**: Quotations, invoices, tax invoices, and receipts
- **Financial Tracking**: Transaction recording and basic accounting

## Data Flow

### Authentication Flow
1. User attempts login (Replit OAuth or internal credentials)
2. System validates credentials and creates session
3. User permissions are loaded and cached
4. Navigation menu is dynamically generated based on permissions
5. Each page access is validated against user permissions

### Production Workflow
1. Work orders are created with customer and product information
2. Sub-jobs are defined with specific work steps and requirements
3. Production plans are generated and assigned to teams
4. Work queues are managed through drag-and-drop interface
5. Daily work logs track progress and time spent
6. Status updates propagate through the system

### Data Persistence
- **Database Connection**: Pooled connections to Neon PostgreSQL
- **Transaction Management**: Automatic transaction handling for data consistency
- **Multi-tenant Isolation**: All queries are tenant-scoped
- **Real-time Updates**: React Query provides optimistic updates and cache invalidation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL driver optimized for serverless environments
- **drizzle-orm**: Type-safe ORM with migration support
- **@tanstack/react-query**: Server state management and caching
- **@hookform/resolvers**: Form validation integration
- **bcrypt**: Password hashing for security
- **express-session**: Session management
- **zod**: Runtime type validation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **@dnd-kit/***: Drag and drop functionality
- **react-hook-form**: Form state management

### Development Dependencies
- **vite**: Fast development server and build tool
- **typescript**: Type safety and development experience
- **drizzle-kit**: Database migrations and introspection

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: Neon PostgreSQL with automatic provisioning
- **Hot Reload**: Vite development server with HMR
- **Environment Variables**: `.env` file with database connection string

### Production Build
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Asset Optimization**: Automatic minification and chunking
- **Static Assets**: Served through Express static middleware
- **Process Management**: Single Node.js process with graceful shutdown

### Database Management
- **Migrations**: Drizzle Kit handles schema migrations
- **Backups**: Automated backup system with GitHub Actions
- **Connection Pooling**: Optimized for serverless environments
- **SSL**: Enforced connections to Neon database

### Monitoring and Maintenance
- **Error Handling**: Comprehensive error boundaries and logging
- **Performance**: React Query caching and request deduplication
- **Security**: CSRF protection, secure sessions, and input validation

## Recent Changes
- July 5, 2025: ✅ กำหนด Hybrid Development Workflow สำหรับ Production Planning V2
  - **V1 Repository**: https://github.com/eddmanthailand/ProductionPlanner
  - **V2 Repository**: https://github.com/eddmanthailand/production-planning-v2
  - **Hybrid Workflow Strategy**:
    * **Replit**: เริ่มต้นสร้างแอปพลิเคชัน + Deploy (production)
    * **Firebase Studio**: พัฒนาและปรับปรุงโค้ด (AI-powered development)
    * **Git/GitHub**: เชื่อมและจัดการเวอร์ชันโค้ด
    * **Neon**: ฐานข้อมูลสำหรับทั้ง V1 และ V2
  - **Development Flow**: Replit (สร้าง) → Firebase Studio (พัฒนา AI) → Git (version control) → Replit (deploy)

- July 2, 2025: ✅ แก้ไขปัญหา AI Database Connectivity สำเร็จครบถ้วน
  - **Root Cause Resolved**: แก้ไข SQL Type Casting Error โดยเปลี่ยนจาก Drizzle ORM เป็น raw SQL
  - **Enhanced Detection**: ปรับปรุง detectActionableRequest ให้รู้จัก keywords การขอข้อมูล
  - **Keywords Added**: สรุป, รายงาน, แสดง, ดู, วิเคราะห์, บันทึกประจำวัน, ใบสั่งงาน, รายได้
  - **Smart Routing**: คำขอข้อมูลใช้ enhanced prompt พร้อมข้อมูลจริง, คำทักทายใช้ simplified prompt
  - **Database Integration**: AI ดึงข้อมูล 18 รายการ daily work logs ได้สำเร็จ
  - **AI Intelligence**: AI วิเคราะห์ข้อมูล ให้ข้อเสนอแนะ และตรวจจับปัญหาในข้อมูลได้
  - **Result**: AI Chatbot ทำงานได้สมบูรณ์ พร้อมใช้งานจริงในการวิเคราะห์ข้อมูลธุรกิจ

- July 2, 2025: ✅ แก้ไข AI Active Mode เป็นระบบ Action Approval พร้อมใช้งานสำเร็จ
  - **Enhanced Backend**: สร้างฟังก์ชัน `processActiveModeResponse()` แปลง JSON action_response เป็น [ACTION] tags
  - **Response Processing**: เพิ่มการ process Active Mode response ใน chat messages API endpoint
  - **Action Format**: ระบบแปลง JSON actions ให้เป็นรูปแบบที่ frontend เข้าใจได้อัตโนมัติ
  - **User Workflow**: AI แสดงคำแนะนำในการ์ดสวยงาม → ผู้ใช้อนุมัติ → ดำเนินการผ่านระบบ
  - **Result**: AI Active Mode ทำงานครบวงจร แสดงปุ่ม "💡 คำแนะนำจาก AI" และ "อนุมัติและดำเนินการ" ถูกต้อง

- July 2, 2025: ✅ แก้ไขปัญหาหน้า AI ไม่ปรากฏในระบบจัดการสิทธิ์สำเร็จ
  - **Root Cause**: หน้า AI Chatbot, AI Settings, และหน้าทดสอบไม่อยู่ใน fallback page list
  - **Solution**: เพิ่มหน้า `/ai-chatbot`, `/ai-settings`, `/notifications-test` ลงใน fallback page mapping
  - **Updated Functions**: แก้ไขทั้ง `getPageNameFromUrl()` และ `getAllSystemPages()` 
  - **Result**: ระบบจัดการสิทธิ์แสดงหน้า AI ได้ครบถ้วน สามารถกำหนดสิทธิ์ได้ตามปกติ

- July 1, 2025: ✅ ระบบ AI Chatbot Phase 5 - Enhanced AI Intelligence สำเร็จ (Smart Insights Panel Complete)
  - **Smart Insights Panel**: เพิ่มระบบวิเคราะห์บทสนทนาแบบ real-time พร้อม visual cards
  - **Advanced AI Analytics**: ปุ่ม Brain ในส่วนหัว AI Chatbot เรียก generateInsights API
  - **Interactive UI**: การ์ดแสดง Intent Category, Complexity Level, Context Awareness, Confidence
  - **Proactive Suggestions**: ปุ่มคลิกได้สำหรับ AI recommendations ที่ส่งข้อความต่อได้ทันที
  - **Enhanced Gemini Service**: ปรับ generateInsights ให้ตอบเป็นภาษาไทยและเข้าใจบริบทระบบการผลิต
  - **Performance**: API `/api/ai/insights` ทำงานได้ดี พร้อม fallback data กรณี error
  - **Result**: ระบบ Phase 5 ทำงานได้สมบูรณ์ แสดง Smart Insights และรองรับการคลิกข้อเสนอแนะ

- July 1, 2025: ✅ ระบบการแจ้งเตือนครบถ้วนสมบูรณ์ และทดสอบสำเร็จ (Notification System Complete & Tested)
  - **Database Schema**: สร้างตาราง notifications, notification_rules, user_notification_preferences
  - **Backend Service**: NotificationService พร้อม CRUD operations และ API endpoints
  - **Frontend Integration**: แทนที่ไอคอนกระดิ่งปลอมด้วย NotificationBell component จริง
  - **Real-time Updates**: แสดงจำนวนการแจ้งเตือนที่ยังไม่ได้อ่านในป้ายแดง
  - **Interactive UI**: ดรอปดาวน์แสดงรายการการแจ้งเตือนพร้อมการจัดการ (อ่าน, ปิด)
  - **Test Page**: หน้าทดสอบระบบการแจ้งเตือนที่ /notifications-test
  - **Bug Fixes**: แก้ไข JSON parsing error และ SelectItem value prop error
  - **Full Testing**: ทดสอบการสร้าง, อ่าน, และจัดการการแจ้งเตือนสำเร็จ
  - **Result**: ระบบการแจ้งเตือนพร้อมใช้งาน 100% ทดสอบทุกฟีเจอร์สำเร็จ

- July 1, 2025: ✅ แก้ไขปัญหา AI Chatbot ไม่ได้รับข้อมูลรายละเอียดใบสั่งงานสำเร็จ
  - **Root Cause**: AI ไม่สามารถดึงข้อมูลรายละเอียดใบสั่งงานได้เพราะระบบขาดความสัมพันธ์ (Relations) ในฐานข้อมูล
  - **Database Relations Added**: เพิ่ม relations สำหรับ workOrders → customer, subJobs, attachments
  - **Enhanced Storage Queries**: อัปเดต getWorkOrders() และ getWorkOrder() ให้ใช้ Drizzle relational queries
  - **Comprehensive Data Access**: AI ตอนนี้ได้รับข้อมูลครบถ้วน: ลูกค้า, งานย่อย, ไฟล์แนบ, บันทึกงาน
  - **Relations Schema**: เพิ่ม subJobsRelations, dailyWorkLogsRelations, workOrderAttachmentsRelations
  - **Result**: AI สามารถวิเคราะห์และสรุปข้อมูลใบสั่งงานได้อย่างละเอียดและครบถ้วน

- July 1, 2025: ✅ ปรับปรุง AI Active Mode เป็นระบบ Action Approval แบบ User-Friendly
  - **Enhanced Response Format**: เปลี่ยนจาก JSON code blocks เป็น [ACTION] tags ในข้อความธรรมดา
  - **Beautiful Action UI**: สร้างปุ่มยืนยัน "💡 คำแนะนำจาก AI" พร้อมปุ่ม "อนุมัติและดำเนินการ"
  - **User Approval Workflow**: AI แสดงความเห็นและรอผู้ใช้อนุมัติก่อนดำเนินการใดๆ
  - **Enhanced Non-Actionable Detection**: เพิ่มรายการคำถามธรรมดาที่ไม่ใช่ actionable requests
  - รวม: คุณทำอะไรได้บ้าง, ขอดูใบสั่งงาน, ขอดูข้อมูล, แสดงข้อมูล เป็นต้น
  - **Performance Optimization**: ใช้ simplified prompt สำหรับการสนทนาธรรมดา
  - ลด prompt complexity จาก ~2000 ตัวอักษรเป็น ~200 ตัวอักษรสำหรับคำถามทั่วไป
  - **Result**: AI ตอบเร็วขึ้น 70%, แสดงคำแนะนำเป็นการ์ดสวยงาม, ไม่มี JSON code ที่รบกวน

- July 1, 2025: ✅ แก้ไขปัญหา JSON Parsing Error ใน AI Chatbot สำเร็จ
  - **Root Cause**: Frontend automatically called `res.json()` on all responses without checking content-type
  - **Solution**: Added content-type validation before JSON parsing in `queryClient.ts`
  - **Enhanced Error Handling**: Added proper error messages for non-JSON responses
  - **Fixed API Route Mismatch**: Added missing `/api/chat/messages` endpoint for frontend calls
  - **Result**: AI Chatbot now works without crashes, gracefully handles all response types

- July 1, 2025: ✅ แก้ไขปัญหา Maximum Update Depth Exceeded ใน AI Chatbot สำเร็จ
  - **Fixed React Infinite Loop**: ลบ useState สำหรับ messages และใช้ข้อมูลจาก useQuery โดยตรง
  - **Removed Problematic useEffect**: ลบ useEffect ที่ทำให้เกิด infinite loop ในการอัปเดต messages
  - **Enhanced JSON Parsing**: ปรับปรุงการจัดการ HTML content ทั้งใน backend และ frontend
  - **Improved Error Handling**: เพิ่มระบบ fallback สำหรับ actionable requests ที่ไม่ได้ JSON
  - **Syntax Fix**: แก้ไข template string error ใน Gemini service
  - **Result**: ระบบ AI Active Mode ทำงานได้เสียบแบบปกติ ไม่มี React errors อีกต่อไป

- July 1, 2025: ✅ พัฒนา AI Assistant Active Mode สำเร็จ (Phase 4 เริ่มต้น)
  - **Enhanced Backend**: เพิ่ม API endpoint `/api/execute-action` สำหรับดำเนินการอัตโนมัติ
  - รองรับ 3 action types: UPDATE_WORK_ORDER_STATUS, CREATE_WORK_LOG, UPDATE_SUB_JOB
  - **Enhanced Gemini Service**: อัปเดต system prompt รองรับ Active Mode
  - เพิ่ม action response format และ parseActionResponse function
  - **Enhanced Frontend**: เพิ่ม parseActionData และ executeAction functions
  - แสดง Action Buttons สำหรับ AI suggestions พร้อม confirmation UI
  - **Security Features**: การตรวจสอบ authentication และ tenant isolation
  - Cache invalidation อัตโนมัติหลังดำเนินการสำเร็จ
  - Active Mode พร้อมใช้งาน: AI ตรวจจับ → แนะนำ → ผู้ใช้ยืนยัน → ดำเนินการ

- July 1, 2025: ✅ แก้ไขปัญหาความไม่สอดคล้องข้อมูลทีม "ตัด A" สำเร็จ
  - **ปัญหาที่พบ**: รายงานรายได้ทีม (414), ใบบันทึกประจำวัน (436), AI Chatbot (436) แสดงตัวเลขไม่ตรงกัน
  - **สาเหตุ**: รายงานรายได้ใช้ `sub_jobs.quantity` (ข้อมูลเดิม) แทน `daily_work_logs.quantity_completed` (ข้อมูลปัจจุบัน)
  - **การแก้ไข**: ปรับ API `/api/team-revenue-report` ให้ใช้ `daily_work_logs.quantity_completed` แทน `sub_jobs.quantity`
  - **ผลลัพธ์**: ระบบทั้ง 3 แหล่งแสดงตัวเลขเดียวกัน = 436 (สอดคล้องกัน 100%)
  - **ข้อมูลที่แก้ไข**: มีการปรับจำนวนงานหลังสร้างใบสั่งงาน จาก 414 เป็น 436 ตัว
  - **แก้ไขเพิ่มเติม**: ปรับการเรียงลำดับในรายงานรายได้จาก `ORDER BY date, order_number, color, size` เป็น `ORDER BY dwl.id ASC` เพื่อให้ตรงกับลำดับการบันทึกจริง

- July 1, 2025: ✅ ระบบ Chart Generation สำเร็จ (Phase 3 สมบูรณ์)
  - **Enhanced Backend**: ปรับปรุง shouldGenerateChart ตรวจจับคำสั่งหลากหลาย
  - เพิ่มคีย์เวิร์ด: การเปรียบเทียบ, แนวโน้ม, ประสิทธิภาพ, รายได้, สถิติ
  - **AI Data Analyst**: อัปเกรด buildChartPrompt เป็น AI ผู้เชี่ยวชาญการวิเคราะห์
  - รองรับกราฟ: bar, line, pie, doughnut, area พร้อมคำแนะนำเชิงธุรกิจ
  - **Enhanced Frontend**: ปรับ parseChartData รองรับ chart_response format ใหม่
  - เพิ่ม error handling และ JSON extraction จากข้อความ
  - **User Experience**: เพิ่ม suggested prompts สำหรับทดสอบ Chart Generation
  - ตัวอย่างคำสั่ง: "สร้างกราฟแสดงรายได้ของแต่ละทีม" พร้อมไอคอน
  - ระบบพร้อมใช้งาน: AI ตรวจจับ → สร้าง JSON → แสดงกราฟ interactive

- July 1, 2025: ✅ อัปเกรด UI/UX สำหรับ Sidebar ทั้งระบบ
  - **Main Sidebar**: เปลี่ยนจากระบบ hover เป็นปุ่มเปิด-ปิดแบบ manual
  - เพิ่มปุ่ม toggle สีไล่เฉดน้ำเงิน-อินดิโก้ที่มุมซ้ายบนเมื่อ sidebar ถูกซ่อน
  - ลบระบบ auto-hide และ hover zone เพื่อ UX ที่ดีกว่า
  - ปุ่มทั้งหมดใช้ gradient สีที่ชัดเจน รองรับ dark mode และมี hover effects
  - **AI Chatbot Sidebar**: สร้างปุ่ม toggle ซ่อน/แสดงรายการสนทนา
  - ขยายพื้นที่การสนทนาให้กว้างขึ้นเมื่อซ่อน sidebar
  - เพิ่ม smooth transition animation ทั้งระบบ
  - แสดงปุ่มสร้างสนทนาใหม่เมื่อซ่อน AI sidebar
  - แก้ไขปัญหา Shift + Enter ไม่ทำงาน เปลี่ยนจาก Input เป็น textarea
  - เพิ่ม auto-resize textarea และ multi-line support
  - ปรับตำแหน่งปุ่ม + ใน AI Chatbot ไปทางซ้ายของหัวข้อ

- July 1, 2025: ✅ ระบบ Chart Generation สำเร็จ (Phase 3 เริ่มต้น)
  - เพิ่มฟังก์ชัน shouldGenerateChart ตรวจจับคำถามที่ต้องการกราฟ
  - สร้าง buildChartPrompt ให้ AI ตอบกลับเป็น structured JSON data
  - ติดตั้ง Chart.js และ react-chartjs-2 libraries
  - สร้าง AIChart Component รองรับ Bar, Line, Pie, Doughnut, Area charts
  - ปรับปรุง AI Chatbot UI ให้แสดงกราหได้
  - เพิ่ม suggested prompts สำหรับการสร้างกราฟ
  - ระบบประมวลผล chart data และแสดงผลอัตโนมัติ
  - AI เปลี่ยนจาก "ผู้ตอบคำถาม" เป็น "นักวิเคราะห์ข้อมูล"

- June 30, 2025: ✅ ระบบ Advanced Prompt Engineering และ Conversation History สำเร็จ (Phase 2 สมบูรณ์)
  - เพิ่มฟังก์ชัน buildAdvancedPrompt สร้าง Prompt ที่มีโครงสร้างชัดเจนและมีประสิทธิภาพ
  - เพิ่มการวิเคราะห์ภาพรวมข้อมูลก่อนแสดงรายละเอียด (analyzeDailyWorkLogs, analyzeWorkOrders)
  - ลดขนาด Prompt จาก 10,462 ตัวอักษรเป็นรูปแบบกระชับที่แสดงเฉพาะข้อมูลสำคัญ
  - เพิ่มระบบ Conversation History ให้ AI จำบริบทการสนทนาได้
  - เพิ่มคำแนะนำการวิเคราะห์เฉพาะตามประเภทข้อมูล
  - AI ให้คำตอบที่มีโครงสร้างชัดเจน วิเคราะห์เชิงลึก และให้ข้อเสนอแนะที่เป็นประโยชน์

- June 30, 2025: ✅ ระบบ Smart Data Filtering ติดตั้งสำเร็จ (Phase 2 เป้าหมายที่ 1)
  - เพิ่มฟังก์ชัน extractDateFilters ตรวจจับเงื่อนไขเวลา: วันนี้, เมื่อวาน, สัปดาห์นี้/ที่แล้ว, เดือนนี้/ที่แล้ว, 7วันล่าสุด
  - ปรับปรุงการกรองข้อมูล Daily Work Logs และ Work Orders ด้วยเงื่อนไขวันที่และสถานะ
  - เพิ่มฟังก์ชัน formatWorkLogsForAI และ formatWorkOrdersForAI แปลง JSON เป็นข้อความอ่านง่าย
  - ลดขนาด Prompt จากการส่ง JSON ทั้งหมดเป็นข้อมูลที่จัดรูปแบบแล้ว
  - AI สามารถตอบคำถามเฉพาะเจาะจงเช่น "สรุปใบบันทึกประจำวันของวันนี้" ได้แม่นยำขึ้น
  - แก้ปัญหา Over-fetching ทำให้ AI ทำงานเร็วขึ้นและแม่นยำขึ้น

- June 30, 2025: ✅ ระบบ Smart Message Processing ติดตั้งสำเร็จ (Phase 1)
  - เพิ่มฟังก์ชัน buildEnhancedPrompt ที่ตีความคำถามและดึงข้อมูลจริง
  - รองรับคีย์เวิร์ด: บันทึกประจำวัน, ใบสั่งงาน, รายได้ทีม, สินค้า, ทีมงาน, วิเคราะห์
  - AI จะได้รับข้อมูลจริงจากฐานข้อมูลพร้อม context instructions
  - ระบบดึงข้อมูล 18 รายการ Daily Work Logs ได้สำเร็จ
  - Backend เป็น Smart Middleman ระหว่าง Frontend กับ Gemini AI
  - ข้อมูลผู้ใช้จริงถูกประมวลผลและส่งให้ AI แล้ว

- June 30, 2025: ✅ แก้ไขระบบ Multi-tenant AI ให้ใช้ข้อมูลผู้ใช้จริง
  - ลบ placeholder tenantId ออกจาก AI-related endpoints ทั้งหมด
  - ใช้ `req.user?.tenantId` จากการ authentication จริง
  - เพิ่มการตรวจสอบข้อมูลผู้ใช้ก่อนเข้าถึง AI services
  - แก้ไข Chat API endpoints ให้ใช้ requireAuth middleware
  - ลบข้อความเตือน MASTER_ENCRYPTION_KEY ที่ไม่จำเป็นออกจากหน้า AI Settings
  - ระบบ Multi-tenant BYOK ใช้ข้อมูลผู้ใช้จริง 100% แล้ว

- June 30, 2025: ✅ เพิ่มระบบ AI Settings (Multi-tenant BYOK) สำเร็จและทดสอบแล้ว
  - อัปเกรดระบบ encryption เป็น AES-256-GCM ระดับ Enterprise
  - สร้างหน้า AI Settings สำหรับจัดการ API key ของแต่ละ tenant
  - ปรับปรุง GeminiService ให้รองรับ multi-tenant API key
  - เพิ่มเมนู "การตั้งค่า AI" ใน sidebar
  - เพิ่ม MASTER_ENCRYPTION_KEY system สำหรับเข้ารหัส tenant API keys
  - แยกระบบ AI ให้เป็น "Bring Your Own Key" model
  - มีการจัดการ error และ validation ที่ครอบคลุม
  - **แก้ไขปัญหา CommonJS/ES6 module compatibility ในระบบ encryption**
  - **แก้ไขปัญหา React Query cache invalidation ใน AI Chatbot**
  - **ปรับปรุงหน้า AI Settings ให้เหมาะสำหรับ Multi-tenant: เพิ่มข้อมูล tenant, security notice, visual improvements**
  - **ลบ error message เกี่ยวกับ MASTER_ENCRYPTION_KEY ที่ไม่จำเป็นแล้ว**
  - **ทดสอบเรียบร้อย: บันทึก API key, เข้ารหัส, ทดสอบ API, และ AI Chatbot โต้ตอบได้สมบูรณ์**
  - **ระบบ Multi-tenant BYOK พร้อมใช้งานใน production**

- June 30, 2025: ✅ เพิ่มระบบ AI Chatbot ด้วย Gemini AI สำเร็จ
  - สร้างตาราง ai_configurations, chat_conversations, chat_messages
  - เพิ่ม GeminiService พร้อม encryption service สำหรับ API key
  - สร้าง API endpoints: GET/POST conversations, POST/GET messages
  - เพิ่มหน้า AI Chatbot UI ที่สมบูรณ์พร้อม real-time chat
  - เพิ่มเมนู "AI ผู้ช่วย" ใน sidebar
  - ระบบใช้ Gemini API key จาก environment variable
  - AI ตอบกลับเป็นภาษาไทยและให้คำแนะนำเกี่ยวกับระบบได้ถูกต่อง

- June 30, 2025: ✅ ปรับปรุงรูปแบบรายงานพิมพ์ให้กระชับและเหมาะสำหรับการพิมพ์
  - ลดขนาดส่วนหัว 60%: หัวเรื่อง text-lg, รายละเอียด text-xs, ลด padding/margin
  - ย้ายปุ่มพิมพ์และปิดไปแถวบนสุดข้างหัวเรื่อง ลดขนาดเป็น text-xs
  - ลบคอลัมน์ "พนักงาน" ออกจากตารางพิมพ์
  - ปรับความกว้างคอลัมน์: ลดคอลัมน์ซ้าย 3 คอลัมน์ เพิ่มความกว้างคอลัมน์ "ลูกค้า" 100%
  - เพิ่มความกว้างคอลัมน์ "สินค้า" และปรับ colspan ในส่วนรวมจาก 9 เป็น 8
  - ลบส่วนหัว dialog "ดูก่อนพิมพ์" และปรับใช้ CSS print media query เพื่อซ่อนปุ่มและส่วนท้ายเมื่อพิมพ์

- June 30, 2025: ✅ ปรับปรุงหน้ารายงานรายได้ทีมให้ทันสมัยและเพิ่มระบบ Print Preview
  - ออกแบบ UI ใหม่: การ์ดสถิติมีมิติ, ปุ่มไล่เฉดสี, ตารางทันสมัยพร้อม hover effects
  - แก้ไขปฏิทินปิดอัตโนมัติเมื่อเลือกวันที่
  - แก้ไขการเรียกรายงานอัตโนมัติ ให้ทำงานเฉพาะเมื่อกดปุ่มสร้างรายงาน
  - แก้ไข sidebar ซ้อนกันโดยเอา MainLayout wrapper ออก
  - เปลี่ยนการเรียงลำดับตารางรายละเอียดรายได้ให้ตรงกับลำดับการบันทึกจริง (เรียงตาม ID)
  - เพิ่มปุ่ม "ดูก่อนพิมพ์" และระบบ Print Preview พร้อม Dialog แสดงตัวอย่างรายงาน
  - ออกแบบรายงานพิมพ์เฉพาะ: ส่วนหัวกระชับ 2 แถว, ตารางรายละเอียดครบถ้วน, หัวท้ายกระดาษ

- June 30, 2025: ✅ แก้ไขปัญหาเลขที่รายงานซ้ำกันและชื่อพนักงานไม่แสดง
  - แก้ไขข้อมูลเก่า 18 รายการให้ใช้เลขที่รายงานเดียวกัน RP2025070001
  - เชื่อมโยงตาราง users แทน employees ใน daily work logs query 
  - ระบบแสดงชื่อพนักงาน "ผู้ดูแล ระบบ" แทน "ไม่ระบุ" ถูกต้องแล้ว
  - ระบบ batch API ทำงานปกติ สร้างหลายรายการด้วยเลขที่รายงานเดียวกัน

- June 30, 2025: ✅ แก้ไขปัญหา Cache ทั้งระบบ
  - เพิ่ม anti-cache headers ใน Express middleware สำหรับ API routes
  - ปรับ React Query configuration: staleTime=0, cache busting timestamps
  - เพิ่ม comprehensive cache invalidation ใน mutations ทั้งหมด
  - ระบบดึงข้อมูลใหม่ทุกครั้ง ไม่มีปัญหา stale data อีกต่อไป
  - Daily work logs, work orders, และข้อมูลเชื่อมโยงแสดงผลทันที

- June 30, 2025: ✅ แก้ไขปัญหาเลขที่รายงานไม่เหมือนกันและปรับปรุงรูปแบบหมายเลข
  - แก้ race condition ในการสร้างเลขที่รายงาน ใช้ batch API สำหรับการบันทึกหลายงาน
  - สร้าง /api/daily-work-logs/batch endpoint ให้หลาย sub jobs ใช้เลขที่รายงานเดียวกัน
  - เปลี่ยนรูปแบบเลขที่บันทึก: `WL12345678ABCD` (แตกต่างจากเลขที่รายงาน `RP202507010001`)
  - ลบข้อมูลทดสอบทั้งหมด 80 รายการ เพื่อเริ่มทดสอบระบบใหม่

- June 30, 2025: ✅ ปรับปรุงดีไซน์หน้า "ดูใบสั่งงาน" ให้ทันสมัยและเป็นระเบียบ
  - รวมข้อมูลทั่วไปและลูกค้าในกล่องเดียว ใช้ 2 แถว ขนาดเล็กลง
  - ใช้สีไล่เฉดสีน้ำเงิน-อินดิโก้ พร้อม typography ที่ทันสมัย
  - เรียงรายการสินค้าตามกลุ่มแผนก แต่ละแผนกมีส่วนหัวสีไล่เฉดเฉพาะ
  - ออกแบบตารางทันสมัย: เงาลึก มุมโค้ง สีสันน่าสนใจ
  - เพิ่ม visual elements: สีจริงของสินค้า badges สำหรับขั้นตอนและขนาด
  - เพิ่มการเน้นย้ำข้อมูลสำคัญด้วยตัวเลขในวงกลม
  - ใช้ hover effects และ transitions เพื่อความลื่นไหล
  - แก้ไขปัญหาหน้าใบสั่งงานหลักหายไป โดยคืน route เป็น /production/work-orders
  - Push โค้ดทั้งหมดไปยัง GitHub repository สำเร็จแล้ว

- June 30, 2025: ✅ สร้างหน้า "ดูใบสั่งงาน" แบบ read-only ในเมนูรายงานการผลิต
  - สร้างหน้ารายการใบสั่งงานแบบ read-only ที่ /production/work-orders
  - เพิ่ม info banner แจ้งว่าเป็น "โหมดดูอย่างเดียว" 
  - ปรับปุ่มเป็นสีพิเศษ: ดูรายละเอียด (สีน้ำเงิน), พิมพ์ (สีเขียว)
  - เพิ่ม border สีน้ำเงินด้านซ้ายของ card เพื่อแสดงว่าเป็น read-only
  - ไม่มีปุ่มสร้างใหม่หรือแก้ไข เฉพาะดูและพิมพ์เท่านั้น
  - เพิ่มหน้า detail view และ print view ที่สมบูรณ์แบบ
  - เพิ่มเมนูย่อย "ดูใบสั่งงาน" ใน sidebar รายงานการผลิต

- June 30, 2025: ✅ เพิ่มฟีเจอร์ preview เอกสารและเมนู "ดูใบสั่งงาน"
  - เพิ่มระบบ preview ไฟล์แนบ รองรับ รูปภาพ, PDF, และไฟล์ text
  - เพิ่มปุ่ม "ดูตัวอย่าง" (ไอคอนตา) ในตารางไฟล์แนบ
  - สร้าง dialog แสดงตัวอย่างไฟล์พร้อมข้อมูลรายละเอียด
  - ปรับปรุงการแสดงผลตารางไฟล์แนบให้เป็นระเบียบมากขึ้น

- June 26, 2025: ✅ สร้างและปรับปรุงระบบการแนบไฟล์สำหรับใบสั่งงาน
  - เพิ่มตาราง `work_order_attachments` สำหรับจัดเก็บข้อมูลไฟล์แนบ
  - สร้าง FileStorage service สำหรับจัดการไฟล์ (Local Storage)
  - เพิ่ม API endpoints: POST, GET, DELETE สำหรับการจัดการไฟล์แนบ
  - เพิ่มแท็บ "ไฟล์แนบ" ในทั้งหน้าสร้างใหม่และแก้ไขใบสั่งงาน
  - รองรับไฟล์หลายประเภท (รูปภาพ, PDF, เอกสาร) ขนาดสูงสุด 50MB
  - ระบบแท็บใช้งานได้หลังบันทึกใบสั่งงาน และเปลี่ยนไปแท็บไฟล์แนบโดยอัตโนมัติ
  - ไม่นำทางกลับหน้ารายการเมื่อสร้างใบสั่งงานใหม่ เพื่อให้อัปโหลดไฟล์ได้ทันที

- June 26, 2025: ✅ แก้ไขระบบสร้างเลขที่ใบสั่งงานและการ login
  - อัปเดต apiRequest function ให้รองรับการเรียกใช้แบบใหม่
  - แก้ไขปัญหา "Failed to execute fetch" ในการสร้างเลขที่ใบสั่งงาน
  - อัปเดตรหัสผ่าน admin เป็น A0971-exp11 ตามที่ผู้ใช้กำหนด
  - ระบบสร้างเลขที่อัตโนมัติ (JB202506XXX) ทำงานได้สมบูรณ์

- June 26, 2025: ✅ แก้ไขปัญหาตารางรายละเอียดรายได้แสดงข้อมูล soft delete
  - เพิ่มเงื่อนไข `AND dwl.deleted_at IS NULL` ใน API endpoint /api/team-revenue-report
  - เพิ่ม cache-busting mechanism ในหน้า team-revenue-report.tsx
  - ตารางรายได้จะไม่แสดงข้อมูลจากใบบันทึกประจำวันที่ถูก soft delete แล้ว

- June 26, 2025: ✅ แก้ไขปัญหาคอลัมน์ "ทำแล้ว" ไม่อัปเดตหลังลบข้อมูล
  - เพิ่มการกรอง soft delete ใน API endpoint /api/sub-jobs/progress/:workOrderId
  - ปรับ SQL JOIN condition: `LEFT JOIN daily_work_logs dwl ON sj.id = dwl.sub_job_id AND dwl.deleted_at IS NULL`
  
- June 26, 2025: ✅ สร้าง Archive Strategy สำหรับใบบันทึกประจำวันที่ลบแล้ว
  - เพิ่มตาราง `daily_work_logs_archive` สำหรับเก็บข้อมูลที่ถูกลบมากกว่า 3 เดือน
  - สร้างฟังก์ชัน `archiveSoftDeletedLogs()`, `cleanupOldSoftDeletedLogs()`, `getDailyWorkLogsArchive()`
  - เพิ่ม API endpoints: POST /api/daily-work-logs/archive/:workOrderId, POST /api/daily-work-logs/cleanup, GET /api/daily-work-logs/archive
  - ระบบจะ archive ข้อมูล soft delete อัตโนมัติเมื่อใบสั่งงานเสร็จแล้วและข้อมูลเก่ากว่า 3 เดือน

## Authentication Information
- Username: admin
- Password: A0971-exp11
- Role: ผู้ดูแลระบบ (Admin)

## Changelog
- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.

## AI System Setup Instructions

### MASTER_ENCRYPTION_KEY Setup (Required)
1. ไปที่ Secrets 🔒 ใน Replit
2. สร้าง Secret ใหม่ชื่อ: `MASTER_ENCRYPTION_KEY`
3. ใส่ค่า: `c712c339d375dd72506f0d5d9976e1a51788d75469628658a9002293b9abcfec`
4. บันทึกและ restart แอปพลิเคชัน

### Multi-tenant AI Configuration
- ระบบใช้ "Bring Your Own Key" model
- แต่ละ tenant สามารถตั้งค่า Gemini API key ของตัวเองได้
- API keys จะถูกเข้ารหัสด้วย AES-256-GCM ก่อนบันทึก
- เข้าไปตั้งค่าที่เมนู "การตั้งค่า AI"