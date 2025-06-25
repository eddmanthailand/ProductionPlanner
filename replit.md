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

## Changelog
- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.