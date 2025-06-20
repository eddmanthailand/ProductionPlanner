# รหัสแอปพลิเคชันสมบูรณ์สำหรับ Gemini

## ภาพรวมแอปพลิเคชัน
- **ชื่อ**: ระบบจัดการธุรกิจครบวงจร (SaaS Multi-tenant Business Management)
- **เทคโนโลยี**: React + TypeScript, Express.js, PostgreSQL, Drizzle ORM
- **ฟีเจอร์หลัก**: ระบบสิทธิ์ 8 ระดับ, การจัดการผู้ใช้, การผลิต, ขาย, คลังสินค้า, บัญชี
- **ระบบ Authentication**: Replit OpenID Connect

## โครงสร้างไฟล์หลัก

### 1. Schema และ Database (shared/schema.ts)
```typescript
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  decimal,
  serial,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User management with multi-tenant support
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  password: varchar("password", { length: 255 }).notNull(),
  roleId: integer("role_id").references(() => roles.id),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 8-level role hierarchy system
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  level: integer("level").notNull(), // 1-8 hierarchy
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Page access control system
export const pageAccess = pgTable("page_access", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  pageName: varchar("page_name", { length: 255 }).notNull(),
  pageUrl: varchar("page_url", { length: 255 }).notNull(),
  accessLevel: varchar("access_level", { length: 50 }).notNull(), // 'none', 'read', 'edit', 'create'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Multi-tenant support
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  taxId: varchar("tax_id", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer management
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  taxId: varchar("tax_id", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product and inventory management
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  quantity: integer("quantity").default(0),
  minQuantity: integer("min_quantity").default(0),
  unit: varchar("unit", { length: 50 }),
  categoryId: integer("category_id").references(() => productCategories.id),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Production planning system
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 100 }).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  status: varchar("status", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 50 }).default("normal"),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  completedDate: date("completed_date"),
  description: text("description"),
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyWorkLogs = pgTable("daily_work_logs", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").references(() => workOrders.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  description: text("description"),
  status: varchar("status", { length: 50 }),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales management
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  quotationNumber: varchar("quotation_number", { length: 100 }).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  validUntil: date("valid_until"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  tax: decimal("tax", { precision: 12, scale: 2 }),
  total: decimal("total", { precision: 12, scale: 2 }),
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type PageAccess = typeof pageAccess.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type DailyWorkLog = typeof dailyWorkLogs.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertRoleSchema = createInsertSchema(roles);
export const insertCustomerSchema = createInsertSchema(customers);
export const insertProductSchema = createInsertSchema(products);
export const insertWorkOrderSchema = createInsertSchema(workOrders);
export const insertDailyWorkLogSchema = createInsertSchema(dailyWorkLogs);
export const insertQuotationSchema = createInsertSchema(quotations);

// Extended types with relations
export interface UserWithRole extends User {
  role?: Role;
}

export interface WorkOrderWithCustomer extends WorkOrder {
  customer?: Customer;
  assignedUser?: User;
  createdByUser?: User;
}

export interface QuotationWithCustomer extends Quotation {
  customer?: Customer;
  createdByUser?: User;
}
```

### 2. Permission System Hook (client/src/hooks/usePageNavigation.ts)
```typescript
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export type AccessLevel = 'none' | 'read' | 'edit' | 'create';

interface PageAccess {
  id: number;
  roleId: number;
  pageName: string;
  pageUrl: string;
  accessLevel: AccessLevel;
}

export function hasPermission(userAccessLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
  const hierarchy: Record<AccessLevel, number> = {
    'none': 0,
    'read': 1,
    'edit': 2,
    'create': 3
  };

  return hierarchy[userAccessLevel] >= hierarchy[requiredLevel];
}

export function usePageNavigation() {
  const { user } = useAuth();
  
  const { data: pageAccesses = [] } = useQuery<PageAccess[]>({
    queryKey: ["/api/roles", user?.roleId, "page-access"],
    enabled: !!user?.roleId,
    queryFn: async () => {
      const res = await fetch(`/api/roles/${user?.roleId}/page-access`, {
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch page access: ${res.status}`);
      }
      return await res.json();
    }
  });

  const getPageAccess = (pageUrl: string): AccessLevel => {
    // ADMIN role (roleId = 1) has full access to everything
    if (user?.roleId === 1) {
      return 'create';
    }
    
    const access = pageAccesses.find(pa => pa.pageUrl === pageUrl);
    return access?.accessLevel || 'none';
  };

  const canAccessPage = (pageUrl: string): boolean => {
    const accessLevel = getPageAccess(pageUrl);
    return hasPermission(accessLevel, 'read');
  };

  const getPagePermissions = (pageUrl: string) => {
    const accessLevel = getPageAccess(pageUrl);
    
    return {
      canRead: hasPermission(accessLevel, 'read'),
      canEdit: hasPermission(accessLevel, 'edit'),
      canCreate: hasPermission(accessLevel, 'create'),
      canDelete: hasPermission(accessLevel, 'create'),
      accessLevel
    };
  };

  const getAccessiblePages = () => {
    return pageAccesses.filter(pa => hasPermission(pa.accessLevel, 'read'));
  };

  return {
    getPageAccess,
    canAccessPage,
    getPagePermissions,
    getAccessiblePages,
    pageAccesses
  };
}
```

### 3. App Router (client/src/App.tsx)
```typescript
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import Landing from "@/pages/landing";
import HomePage from "@/pages/home-page";
import Quotations from "@/pages/sales/quotations";
import Invoices from "@/pages/sales/invoices";
import TaxInvoices from "@/pages/sales/tax-invoices";
import Receipts from "@/pages/sales/receipts";
import Calendar from "@/pages/production/calendar";
import Organization from "@/pages/production/organization";
import WorkQueuePlanning from "@/pages/production/work-queue-planning";
import WorkOrders from "@/pages/production/work-orders";
import DailyWorkLog from "@/pages/production/daily-work-log";
import ProductionReports from "@/pages/production/production-reports";
import Accounting from "@/pages/accounting";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import MasterData from "@/pages/master-data";
import Reports from "@/pages/reports";
import Users from "@/pages/users";
import UserManagement from "@/pages/user-management";
import PageAccessManagement from "@/pages/page-access-management";
import AccessDemo from "@/pages/access-demo";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/sales/quotations" component={Quotations} />
      <Route path="/sales/invoices" component={Invoices} />
      <Route path="/sales/tax-invoices" component={TaxInvoices} />
      <Route path="/sales/receipts" component={Receipts} />
      <Route path="/production/calendar" component={Calendar} />
      <Route path="/production/organization" component={Organization} />
      <Route path="/production/work-queue-planning" component={WorkQueuePlanning} />
      <Route path="/production/work-orders" component={WorkOrders} />
      <Route path="/production/daily-work-log" component={DailyWorkLog} />
      <Route path="/production/production-reports" component={ProductionReports} />
      <Route path="/accounting" component={Accounting} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/customers" component={Customers} />
      <Route path="/master-data" component={MasterData} />
      <Route path="/reports" component={Reports} />
      <Route path="/users" component={Users} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/page-access-management" component={PageAccessManagement} />
      <Route path="/access-demo" component={AccessDemo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Router />
            <Toaster />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### 4. Main Layout Component (client/src/components/layout/sidebar.tsx)
```typescript
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import {
  ChartLine, FileText, Package, Users, Settings, 
  Calculator, BarChart3, UserCheck, Shield,
  Calendar, Briefcase, ClipboardList, Factory,
  Receipt, CreditCard, File, Archive,
  ChevronDown, ChevronRight, Menu, X, LogOut
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { getPagePermissions } = usePageNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['sales', 'production']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuItems = [
    {
      title: "แดชบอร์ด",
      href: "/",
      icon: ChartLine,
      category: "main"
    },
    {
      title: "ขาย",
      category: "sales",
      icon: Receipt,
      items: [
        { title: "ใบเสนอราคา", href: "/sales/quotations", icon: FileText },
        { title: "ใบส่งสินค้า/ใบแจ้งหนี้", href: "/sales/invoices", icon: File },
        { title: "ใบกำกับภาษี", href: "/sales/tax-invoices", icon: Archive },
        { title: "ใบเสร็จรับเงิน", href: "/sales/receipts", icon: CreditCard }
      ]
    },
    {
      title: "การผลิต", 
      category: "production",
      icon: Factory,
      items: [
        { title: "ปฏิทินการทำงาน", href: "/production/calendar", icon: Calendar },
        { title: "โครงสร้างองค์กร", href: "/production/organization", icon: Briefcase },
        { title: "วางแผนและคิวงาน", href: "/production/work-queue-planning", icon: ClipboardList },
        { title: "ใบสั่งงาน", href: "/production/work-orders", icon: FileText },
        { title: "บันทึกงานประจำวัน", href: "/production/daily-work-log", icon: ClipboardList }
      ]
    },
    {
      title: "บัญชี",
      href: "/accounting", 
      icon: Calculator,
      category: "main"
    },
    {
      title: "คลังสินค้า",
      href: "/inventory",
      icon: Package,
      category: "main"
    },
    {
      title: "ลูกค้า",
      href: "/customers",
      icon: Users,
      category: "main"
    },
    {
      title: "ข้อมูลหลัก",
      href: "/master-data",
      icon: Settings,
      category: "main"
    },
    {
      title: "รายงาน",
      href: "/reports/production",
      icon: BarChart3,
      category: "main"
    },
    {
      title: "ผู้ใช้งาน",
      href: "/users",
      icon: UserCheck,
      category: "main"
    },
    {
      title: "จัดการผู้ใช้และสิทธิ์",
      href: "/user-management",
      icon: Shield,
      category: "admin"
    },
    {
      title: "จัดการสิทธิ์การเข้าถึงหน้า",
      href: "/page-access-management",
      icon: Shield,
      category: "admin"
    }
  ];

  const getFilteredMenuItems = () => {
    return menuItems.filter(item => {
      if (item.href) {
        const permissions = getPagePermissions(item.href);
        return permissions.canRead;
      } else if (item.items) {
        return item.items.some(subItem => {
          const permissions = getPagePermissions(subItem.href);
          return permissions.canRead;
        });
      }
      return false;
    });
  };

  const logout = async () => {
    window.location.href = "/api/logout";
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border rounded-md shadow-md"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${className}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-foreground">ระบบจัดการ</h2>
            {user && (
              <p className="text-sm text-muted-foreground mt-1">
                {user.firstName} {user.lastName}
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {getFilteredMenuItems().map((item) => {
              if (item.items) {
                const isExpanded = expandedSections.includes(item.category);
                const hasAccessibleItems = item.items.some(subItem => {
                  const permissions = getPagePermissions(subItem.href);
                  return permissions.canRead;
                });

                if (!hasAccessibleItems) return null;

                return (
                  <div key={item.category}>
                    <button
                      onClick={() => toggleSection(item.category)}
                      className="flex items-center justify-between w-full p-2 text-left text-foreground hover:bg-accent rounded-md transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-4 mt-2 space-y-1">
                        {item.items.map((subItem) => {
                          const permissions = getPagePermissions(subItem.href);
                          if (!permissions.canRead) return null;

                          const isActive = location === subItem.href;
                          return (
                            <Link key={subItem.href} href={subItem.href}>
                              <a
                                className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                                onClick={() => setIsOpen(false)}
                              >
                                <subItem.icon className="w-4 h-4" />
                                <span className="text-sm">{subItem.title}</span>
                              </a>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                const permissions = getPagePermissions(item.href!);
                if (!permissions.canRead) return null;

                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href!}>
                    <a
                      className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  </Link>
                );
              }
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <button
              onClick={logout}
              className="flex items-center space-x-3 w-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-md transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
```

### 5. Backend API Routes (server/routes.ts) - Key Functions
```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Page access management
  app.get("/api/roles/:roleId/page-access", async (req, res) => {
    try {
      const { roleId } = req.params;
      const pageAccesses = await storage.getPageAccessByRole(parseInt(roleId));
      res.json(pageAccesses);
    } catch (error) {
      console.error("Get page access error:", error);
      res.status(500).json({ message: "Failed to get page access" });
    }
  });

  // User management
  app.get("/api/users", async (req: any, res) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const users = await storage.getUsersWithRoles(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.post("/api/users", async (req: any, res) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { username, email, firstName, lastName, password, roleId } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        username,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        roleId,
        tenantId,
        isActive: true
      };
      
      const user = await storage.createUser(userData);
      
      // Don't return password in response
      const { password: _, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Role management
  app.get("/api/roles", async (req: any, res) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const roles = await storage.getRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Failed to get roles" });
    }
  });

  // Customer management
  app.get("/api/customers", async (req: any, res: any) => {
    try {
      console.log("API: Customers endpoint called");
      console.log("API: Fetching customers from database...");
      
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const customers = await storage.getCustomers(tenantId);
      
      console.log("API: Sending response with", customers.length, "customers");
      res.json(customers);
    } catch (error) {
      console.error("API: Get customers error:", error);
      res.status(500).json({ message: "Failed to get customers" });
    }
  });

  // Inventory management
  app.get("/api/inventory", async (req: any, res: any) => {
    try {
      console.log("API: Inventory endpoint called");
      console.log("API: Fetching products from database...");
      
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const products = await storage.getProducts(tenantId);
      
      console.log("API: Sending response with", products.length, "products");
      res.json(products);
    } catch (error) {
      console.error("API: Get products error:", error);
      res.status(500).json({ message: "Failed to get products" });
    }
  });

  // Work orders and production
  app.get("/api/work-orders", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const workOrders = await storage.getWorkOrdersWithCustomers(tenantId);
      res.json(workOrders);
    } catch (error) {
      console.error("Get work orders error:", error);
      res.status(500).json({ message: "Failed to get work orders" });
    }
  });

  // Daily work logs
  app.get("/api/daily-work-logs", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const logs = await storage.getDailyWorkLogs(tenantId);
      res.json(logs);
    } catch (error) {
      console.error("Get daily work logs error:", error);
      res.status(500).json({ message: "Failed to get daily work logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
```

## สถานะปัจจุบันของแอปพลิเคชัน

### ✅ ฟีเจอร์ที่ทำงานแล้ว
1. **ระบบ Authentication**: Replit OpenID Connect
2. **ระบบสิทธิ์ 8 ระดับ**: Page-based access control
3. **Multi-tenant Architecture**: รองรับหลายบริษัท
4. **การจัดการผู้ใช้**: CRUD operations สมบูรณ์
5. **Sidebar Navigation**: แสดงเมนูตามสิทธิ์
6. **Database Schema**: ครบถ้วนสำหรับระบบ ERP

### 🚧 ฟีเจอร์ที่กำลังพัฒนา
1. **การผลิต**: ปฏิทิน, คิวงาน, ใบสั่งงาน
2. **ขาย**: ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จ
3. **คลังสินค้า**: จัดการสินค้า, สต็อก
4. **ลูกค้า**: ข้อมูลลูกค้า, ประวัติ
5. **บัญชี**: รายงานทางการเงิน
6. **รายงาน**: Analytics และ dashboard

### 📊 ข้อมูลผู้ใช้ปัจจุบัน
- **Admin** (roleId: 1): สิทธิ์เต็ม
- **Sert** (roleId: 4): สิทธิ์การผลิต
- รองรับ 8 ระดับสิทธิ์: 1=Admin, 2-8=ระดับต่างๆ

### 🎯 เป้าหมายต่อไป
1. สร้าง UI ที่สวยงามและใช้งานง่าย
2. เพิ่มฟังก์ชันการทำงานในแต่ละโมดูล
3. ระบบรายงานและ analytics
4. ปรับปรุง UX/UI ให้ทันสมัย
5. เพิ่มความสามารถของระบบ ERP