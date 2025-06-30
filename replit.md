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