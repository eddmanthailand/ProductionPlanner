import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, jsonb, varchar, date, index, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

// ===== REPLIT AUTH TABLES =====
// Session storage table for Replit Auth (required)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Replit Auth Users table (separate from internal users)
export const replitAuthUsers = pgTable("replit_auth_users", {
  id: varchar("id").primaryKey().notNull(), // Replit user ID (string)
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Link to internal user system
  internalUserId: integer("internal_user_id").references(() => users.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ===== INTERNAL SYSTEM TABLES =====
// Tenants table
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("basic"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Roles table with predefined hierarchy levels
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., 'ADMIN', 'GENERAL_MANAGER'
  displayName: text("display_name").notNull(), // e.g., 'ADMIN', 'กรรมการผู้จัดการ'
  description: text("description"),
  level: integer("level").notNull(), // 1=ADMIN, 2=กรรมการผู้จัดการ, etc.
  tenantId: uuid("tenant_id").references(() => tenants.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Predefined role levels constant
export const ROLE_LEVELS = {
  ADMIN: 1,
  GENERAL_MANAGER: 2,
  FACTORY_MANAGER: 3,
  SUPERVISOR: 4,
  ACCOUNTING_MANAGER: 5,
  ACCOUNTANT: 6,
  MARKETING_MANAGER: 7,
  MARKETING_TEAM_LEAD: 8
} as const;

// Permissions table
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 50 }).notNull(), // dashboard, sales, production, etc.
  action: varchar("action", { length: 50 }).notNull(), // read, write, delete, manage
  resource: varchar("resource", { length: 100 }).notNull(), // specific page or feature
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Role permissions mapping
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  uniqueRolePermission: uniqueIndex("unique_role_permission").on(table.roleId, table.permissionId)
}));

// Page access permissions mapping
export const pageAccess = pgTable("page_access", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  pageName: varchar("page_name", { length: 255 }).notNull(),
  pageUrl: varchar("page_url", { length: 500 }).notNull(),
  accessLevel: varchar("access_level", { length: 50 }).notNull().default("none"), // 'none', 'read', 'edit', 'create'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  uniqueRolePageUrl: uniqueIndex("unique_role_page_url").on(table.roleId, table.pageUrl)
}));

// User sessions table
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Users table with tenant association
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  roleId: integer("role_id").references(() => roles.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Products and Services table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").notNull(),
  type: text("type").notNull().default("service"), // "service", "non_stock_product", "stock_product"
  price: decimal("price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  category: text("category"),
  unit: text("unit").notNull().default("ชิ้น"),
  // Stock management fields (only for stock_product type)
  currentStock: integer("current_stock").default(0),
  minStock: integer("min_stock").default(0),
  maxStock: integer("max_stock"),
  location: text("location"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});



// Stock movements table - for tracking stock changes
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text("type").notNull(), // "in", "out", "adjustment"
  quantity: integer("quantity").notNull(),
  reference: text("reference"), // Order number, adjustment reason, etc.
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow()
});

// Accounting transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // income, expense, transfer
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  reference: text("reference"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Activities log table
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").references(() => users.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  taxId: text("tax_id"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  postalCode: text("postal_code"),
  country: text("country").default("Thailand"),
  contactPerson: text("contact_person"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Colors table
export const colors = pgTable("colors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"), // รหัสสี เช่น #FF0000
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Sizes table
export const sizes = pgTable("sizes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // S, M, L, XL หรือ 28, 30, 32
  sortOrder: integer("sort_order").default(0),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Work Types table
export const workTypes = pgTable("work_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // เช่น เสื้อยืด, กระโปรง, กางเกง
  code: text("code"), // รหัสประเภทงาน เช่น T-SHIRT, SKIRT, PANTS
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Quotations table
export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  quotationNumber: varchar("quotation_number", { length: 50 }).notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  projectName: varchar("project_name", { length: 200 }),
  date: date("date").notNull(),
  validUntil: date("valid_until").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default("7"),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, accepted, rejected, expired
  notes: text("notes"),
  terms: text("terms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quotation Items table
export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  stockMovements: many(stockMovements),
  transactions: many(transactions),
  activities: many(activities),
  customers: many(customers),
  colors: many(colors),
  sizes: many(sizes),
  workTypes: many(workTypes),
  quotations: many(quotations)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id]
  }),
  activities: many(activities)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id]
  }),
  stockMovements: many(stockMovements)
}));



export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stockMovements.tenantId],
    references: [tenants.id]
  }),
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id]
  })
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [transactions.tenantId],
    references: [tenants.id]
  })
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activities.tenantId],
    references: [tenants.id]
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id]
  })
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id]
  }),
  workOrders: many(workOrders)
}));

export const colorsRelations = relations(colors, ({ one }) => ({
  tenant: one(tenants, {
    fields: [colors.tenantId],
    references: [tenants.id]
  })
}));

export const sizesRelations = relations(sizes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sizes.tenantId],
    references: [tenants.id]
  })
}));

export const workTypesRelations = relations(workTypes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [workTypes.tenantId],
    references: [tenants.id]
  })
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [quotations.tenantId],
    references: [tenants.id]
  }),
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id]
  }),
  items: many(quotationItems)
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id]
  }),
  product: one(products, {
    fields: [quotationItems.productId],
    references: [products.id]
  })
}));

// Organization tables
export const departments = pgTable("departments", {
  id: text("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  manager: text("manager"),
  location: text("location").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  leader: text("leader"),
  costPerDay: decimal("cost_per_day", { precision: 10, scale: 2 }).notNull().default("0.00"), // ต้นทุนต่อวัน (บาท) = กำลังการผลิต
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  count: integer("count").notNull(), // จำนวนพนักงาน
  averageWage: decimal("average_wage", { precision: 10, scale: 2 }).notNull(), // ค่าแรงเฉลี่ย/คน
  overheadPercentage: decimal("overhead_percentage", { precision: 5, scale: 2 }).notNull(), // %overhead
  managementPercentage: decimal("management_percentage", { precision: 5, scale: 2 }).notNull(), // %management
  description: text("description"), // คำอธิบายประเภทพนักงาน เช่น "ช่างตัด", "ช่างเย็บ"
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workSteps = pgTable("work_steps", {
  id: text("id").primaryKey(),
  departmentId: text("department_id").references(() => departments.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(),
  requiredSkills: text("required_skills").array().notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Production Capacity table
export const productionCapacity = pgTable("production_capacity", {
  id: text("id").primaryKey(),
  teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  capacityPerDay: integer("capacity_per_day").notNull(), // pieces per day
  workingHoursPerDay: decimal("working_hours_per_day", { precision: 4, scale: 2 }).notNull().default("8.00"),
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }).notNull().default("100.00"), // percentage
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Work Queue table
export const workQueue = pgTable("work_queue", {
  id: text("id").primaryKey(),
  subJobId: integer("sub_job_id").references(() => subJobs.id, { onDelete: "cascade" }).notNull(),
  orderNumber: text("order_number").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  priority: integer("priority").notNull().default(1), // 1=highest, 5=lowest
  teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  estimatedDays: decimal("estimated_days", { precision: 5, scale: 2 }),
  startDate: date("start_date"),
  expectedEndDate: date("expected_end_date"),
  actualEndDate: date("actual_end_date"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Holidays table
export const holidays = pgTable("holidays", {
  id: text("id").primaryKey(),
  date: date("date").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("national"), // national, company, custom
  isRecurring: boolean("is_recurring").notNull().default(false),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Work Orders table
export const workOrders = pgTable("work_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  quotationId: integer("quotation_id").references(() => quotations.id), // optional reference to quotation
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerTaxId: text("customer_tax_id"),
  customerAddress: text("customer_address"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  title: text("title").notNull(),
  description: text("description"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"), // draft, approved, in_progress, completed, cancelled
  priority: integer("priority").notNull().default(3), // 1=highest, 5=lowest
  workTypeId: integer("work_type_id").references(() => workTypes.id),
  startDate: date("start_date"),
  deliveryDate: date("delivery_date"),
  completedDate: date("completed_date"),
  
  // เพิ่มฟิลด์สำหรับจัดการสถานะการจัดส่ง
  deliveryStatus: text("delivery_status").notNull().default("pending"), // pending, ready_for_dispatch, shipped, delivered
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Work Order Items table
export const workOrderItems = pgTable("work_order_items", {
  id: serial("id").primaryKey(),
  workOrderId: text("work_order_id").references(() => workOrders.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
  colorId: integer("color_id").references(() => colors.id),
  sizeId: integer("size_id").references(() => sizes.id),
  specifications: text("specifications"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sub Jobs table
export const subJobs = pgTable("sub_jobs", {
  id: serial("id").primaryKey(),
  workOrderId: text("work_order_id").references(() => workOrders.id, { onDelete: "cascade" }).notNull(),
  productName: text("product_name").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  workStepId: text("work_step_id").references(() => workSteps.id),
  colorId: integer("color_id").references(() => colors.id),
  sizeId: integer("size_id").references(() => sizes.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("350.00"), // ราคาต่อชิ้น
  productionCost: decimal("production_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  sortOrder: integer("sort_order").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Removed duplicate SubJob types - moved to end of file

// Daily Work Logs table
export const dailyWorkLogs = pgTable("daily_work_logs", {
  id: text("id").primaryKey().$defaultFn(() => `WL${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`),
  reportNumber: text("report_number").notNull(),
  date: date("date").notNull(),
  teamId: text("team_id").references(() => teams.id).notNull(),
  employeeId: text("employee_id").references(() => employees.id).notNull(),
  workOrderId: text("work_order_id").references(() => workOrders.id).notNull(),
  subJobId: integer("sub_job_id").references(() => subJobs.id).notNull(),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 1 }).notNull(),
  quantityCompleted: integer("quantity_completed").default(0),
  workDescription: text("work_description").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress, completed, paused
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Daily Work Logs Archive table - สำหรับเก็บข้อมูลที่ถูกลบแล้วมากกว่า 3 เดือน
export const dailyWorkLogsArchive = pgTable("daily_work_logs_archive", {
  id: text("id").primaryKey(),
  reportNumber: text("report_number").notNull(),
  date: date("date").notNull(),
  teamId: text("team_id").notNull(),
  employeeId: text("employee_id").notNull(),
  workOrderId: text("work_order_id").notNull(),
  subJobId: integer("sub_job_id").notNull(),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 1 }).notNull(),
  quantityCompleted: integer("quantity_completed").default(0),
  workDescription: text("work_description").notNull(),
  status: text("status").notNull().default("in_progress"),
  notes: text("notes"),
  tenantId: uuid("tenant_id").notNull(),
  originalCreatedAt: timestamp("original_created_at").notNull(),
  originalUpdatedAt: timestamp("original_updated_at").notNull(),
  originalDeletedAt: timestamp("original_deleted_at").notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
  workOrderStatus: text("work_order_status"), // สถานะของใบสั่งงานเมื่อถูก archive
});

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});



export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
  id: true,
  createdAt: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertColorSchema = createInsertSchema(colors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSizeSchema = createInsertSchema(sizes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({
  id: true,
  createdAt: true
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true
});

export const insertPageAccessSchema = createInsertSchema(pageAccess).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Type definitions (moved to end of file to avoid duplicates)

// Organization relations
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id]
  }),
  teams: many(teams),
  workSteps: many(workSteps)
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  department: one(departments, {
    fields: [teams.departmentId],
    references: [departments.id]
  }),
  employees: many(employees),
  productionCapacity: many(productionCapacity),
  workQueue: many(workQueue)
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  team: one(teams, {
    fields: [employees.teamId],
    references: [teams.id]
  })
}));

export const workStepsRelations = relations(workSteps, ({ one }) => ({
  department: one(departments, {
    fields: [workSteps.departmentId],
    references: [departments.id]
  })
}));

export const productionCapacityRelations = relations(productionCapacity, ({ one }) => ({
  team: one(teams, {
    fields: [productionCapacity.teamId],
    references: [teams.id]
  })
}));

export const workQueueRelations = relations(workQueue, ({ one }) => ({
  team: one(teams, {
    fields: [workQueue.teamId],
    references: [teams.id]
  })
}));



export const workOrderItemsRelations = relations(workOrderItems, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [workOrderItems.workOrderId],
    references: [workOrders.id]
  }),
  product: one(products, {
    fields: [workOrderItems.productId],
    references: [products.id]
  }),
  color: one(colors, {
    fields: [workOrderItems.colorId],
    references: [colors.id]
  }),
  size: one(sizes, {
    fields: [workOrderItems.sizeId],
    references: [sizes.id]
  })
}));

// Organization insert schemas
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWorkStepSchema = createInsertSchema(workSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductionCapacitySchema = createInsertSchema(productionCapacity).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWorkQueueSchema = createInsertSchema(workQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSubJobSchema = createInsertSchema(subJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWorkOrderItemSchema = createInsertSchema(workOrderItems).omit({
  id: true,
  createdAt: true
});

export const insertDailyWorkLogSchema = createInsertSchema(dailyWorkLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  reportNumber: true // ไม่ต้องส่ง reportNumber มาจาก client จะสร้างใน server
}).extend({
  hoursWorked: z.string().optional().default("0") // ทำให้ hoursWorked เป็น string และมีค่า default
});

// Work Order Attachments table
export const workOrderAttachments = pgTable("work_order_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workOrderId: text("work_order_id").notNull().references(() => workOrders.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(), // ชื่อไฟล์เดิม
  originalName: text("original_name").notNull(), // ชื่อไฟล์ที่ผู้ใช้อัปโหลด
  fileSize: integer("file_size").notNull(), // ขนาดไฟล์ในไบต์
  mimeType: text("mime_type").notNull(), // ประเภทไฟล์
  storageType: text("storage_type").notNull().default("local"), // local, google_cloud, aws_s3
  storagePath: text("storage_path").notNull(), // path หรือ key ในระบบจัดเก็บ
  fileUrl: text("file_url"), // URL สำหรับเข้าถึงไฟล์
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  description: text("description"), // รายละเอียดไฟล์
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at") // soft delete
});

export const insertWorkOrderAttachmentSchema = createInsertSchema(workOrderAttachments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

// Replit Auth Types
export type ReplitAuthUser = typeof replitAuthUsers.$inferSelect;
export type UpsertReplitAuthUser = typeof replitAuthUsers.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = Partial<InsertUser & { deletedAt?: Date | null }>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;



export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Color = typeof colors.$inferSelect;
export type InsertColor = z.infer<typeof insertColorSchema>;

export type Size = typeof sizes.$inferSelect;
export type InsertSize = z.infer<typeof insertSizeSchema>;

export const insertWorkTypeSchema = createInsertSchema(workTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type WorkType = typeof workTypes.$inferSelect;
export type InsertWorkType = z.infer<typeof insertWorkTypeSchema>;

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;

export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;

// Organization types
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type WorkStep = typeof workSteps.$inferSelect;
export type InsertWorkStep = z.infer<typeof insertWorkStepSchema>;

export type WorkOrderAttachment = typeof workOrderAttachments.$inferSelect;
export type InsertWorkOrderAttachment = z.infer<typeof insertWorkOrderAttachmentSchema>;

export type ProductionCapacity = typeof productionCapacity.$inferSelect;
export type InsertProductionCapacity = z.infer<typeof insertProductionCapacitySchema>;

export type WorkQueue = typeof workQueue.$inferSelect;
export type InsertWorkQueue = z.infer<typeof insertWorkQueueSchema>;

export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

export type WorkOrderItem = typeof workOrderItems.$inferSelect;
export type InsertWorkOrderItem = z.infer<typeof insertWorkOrderItemSchema>;

export type SubJob = typeof subJobs.$inferSelect & {
  orderNumber?: string;
  customerName?: string;
  deliveryDate?: string;
  jobName?: string;
  colorName?: string;
  sizeName?: string;
};
export type InsertSubJob = z.infer<typeof insertSubJobSchema>;

export const insertDailyWorkLogArchiveSchema = createInsertSchema(dailyWorkLogsArchive).omit({
  archivedAt: true
});

export type DailyWorkLog = typeof dailyWorkLogs.$inferSelect;
export type InsertDailyWorkLog = z.infer<typeof insertDailyWorkLogSchema>;

// Extended type with joined data
export type DailyWorkLogWithDetails = DailyWorkLog & {
  orderNumber?: string;
  customerName?: string;
  deliveryDate?: string;
  productName?: string;
  subJobQuantity?: number;
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
  teamName?: string;
  employeeName?: string;
};
export type DailyWorkLogArchive = typeof dailyWorkLogsArchive.$inferSelect;
export type InsertDailyWorkLogArchive = z.infer<typeof insertDailyWorkLogArchiveSchema>;

// Production Plans table
export const productionPlans = pgTable("production_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: text("team_id").references(() => teams.id),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  status: text("status").notNull().default("active") // active, completed, cancelled
});

// Production Plan Items table  
export const productionPlanItems = pgTable("production_plan_items", {
  id: serial("id").primaryKey(),
  planId: uuid("plan_id").references(() => productionPlans.id),
  subJobId: integer("sub_job_id").references(() => subJobs.id),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  productName: text("product_name").notNull(),
  colorName: text("color_name").notNull(),
  sizeName: text("size_name").notNull(),
  quantity: integer("quantity").notNull(),
  completionDate: date("completion_date").notNull(),
  jobCost: decimal("job_cost", { precision: 10, scale: 2 }).notNull(),
  priority: integer("priority").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow()
});

// Schema for production plans
export const insertProductionPlanSchema = createInsertSchema(productionPlans);
export const insertProductionPlanItemSchema = createInsertSchema(productionPlanItems);

export type ProductionPlan = typeof productionPlans.$inferSelect;
export type InsertProductionPlan = z.infer<typeof insertProductionPlanSchema>;

export type ProductionPlanItem = typeof productionPlanItems.$inferSelect;
export type InsertProductionPlanItem = z.infer<typeof insertProductionPlanItemSchema>;

// Role and Permission Types
export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// User with Role information
export type UserWithRole = typeof users.$inferSelect & {
  role?: Role;
};

// Permission check utility type
export type PermissionCheck = {
  resource: string;
  action: string;
};

// Predefined role hierarchy with Thai names
export const PREDEFINED_ROLES = [
  { name: 'ADMIN', displayName: 'ADMIN', level: 1, description: 'ผู้ดูแลระบบสูงสุด' },
  { name: 'GENERAL_MANAGER', displayName: 'กรรมการผู้จัดการ', level: 2, description: 'กรรมการผู้จัดการ' },
  { name: 'FACTORY_MANAGER', displayName: 'ผู้จัดการโรงงาน', level: 3, description: 'ผู้จัดการโรงงาน' },
  { name: 'SUPERVISOR', displayName: 'ซูเปอร์ไวเซอร์', level: 4, description: 'ซูเปอร์ไวเซอร์' },
  { name: 'ACCOUNTING_MANAGER', displayName: 'ผู้จัดการฝ่ายบัญชี', level: 5, description: 'ผู้จัดการฝ่ายบัญชี' },
  { name: 'ACCOUNTANT', displayName: 'Junior/Senior Accountant', level: 6, description: 'นักบัญชี' },
  { name: 'MARKETING_MANAGER', displayName: 'ผู้จัดการฝ่ายการตลาด', level: 7, description: 'ผู้จัดการฝ่ายการตลาด' },
  { name: 'MARKETING_TEAM_LEAD', displayName: 'หัวหน้าทีมการตลาด', level: 8, description: 'หัวหน้าทีมการตลาด' }
] as const;

// Permission resources and actions
export const RESOURCES = {
  USERS: 'users',
  ROLES: 'roles',
  SALES: 'sales',
  QUOTATIONS: 'quotations',
  PRODUCTION: 'production',
  WORK_ORDERS: 'work_orders',
  INVENTORY: 'inventory',
  CUSTOMERS: 'customers',
  ACCOUNTING: 'accounting',
  REPORTS: 'reports',
  MASTER_DATA: 'master_data'
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage'
} as const;

// Page Access types
export type PageAccess = typeof pageAccess.$inferSelect;
export type InsertPageAccess = z.infer<typeof insertPageAccessSchema>;

// ===== AI CHATBOT TABLES =====
// AI Configuration table for storing tenant-specific AI settings
export const aiConfigurations = pgTable("ai_configurations", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull().unique(),
  aiProvider: varchar("ai_provider", { length: 50 }).notNull(), // 'gemini', 'openai', etc.
  encryptedApiKey: text("encrypted_api_key").notNull(),
  persona: varchar("persona", { length: 20 }).default('neutral'), // 'neutral', 'male', 'female'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat conversations table
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => chatConversations.id).notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional context
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Relations
export const aiConfigurationsRelations = relations(aiConfigurations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [aiConfigurations.tenantId],
    references: [tenants.id]
  })
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [chatConversations.tenantId],
    references: [tenants.id]
  }),
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id]
  }),
  messages: many(chatMessages)
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id]
  })
}));



// Notifications System Tables
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => `NOT${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // deadline_warning, status_change, overdue_task, system_alert
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("unread"), // unread, read, dismissed
  relatedType: text("related_type"), // work_order, daily_work_log, production_plan
  relatedId: text("related_id"), // ID of related record
  metadata: jsonb("metadata"), // Additional context data
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
  scheduledFor: timestamp("scheduled_for"), // For delayed notifications
  expiresAt: timestamp("expires_at"), // Auto-cleanup old notifications
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationRules = pgTable("notification_rules", {
  id: text("id").primaryKey().$defaultFn(() => `NR${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(), // deadline_approaching, status_changed, overdue, etc.
  conditions: jsonb("conditions").notNull(), // Rule conditions in JSON format
  actions: jsonb("actions").notNull(), // Actions to take (notification details)
  isActive: boolean("is_active").notNull().default(true),
  priority: text("priority").notNull().default("medium"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: text("id").primaryKey().$defaultFn(() => `UNP${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  notificationType: text("notification_type").notNull(), // matches notification.type
  enabled: boolean("enabled").notNull().default(true),
  channels: jsonb("channels").notNull().default('["in_app"]'), // in_app, email, sms
  frequency: text("frequency").notNull().default("immediate"), // immediate, hourly, daily, weekly
  quietHours: jsonb("quiet_hours"), // {start: "22:00", end: "08:00"}
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Unique constraint to prevent duplicate preferences
  unique("unique_user_notification_type").on(table.userId, table.notificationType)
]);

// AI Schema types
export const insertAiConfigurationSchema = createInsertSchema(aiConfigurations);
export const insertChatConversationSchema = createInsertSchema(chatConversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);

// Notification Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id]
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const notificationRulesRelations = relations(notificationRules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notificationRules.tenantId],
    references: [tenants.id]
  }),
  createdBy: one(users, {
    fields: [notificationRules.createdBy],
    references: [users.id]
  })
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({ one }) => ({
  tenant: one(tenants, {
    fields: [userNotificationPreferences.tenantId],
    references: [tenants.id]
  }),
  user: one(users, {
    fields: [userNotificationPreferences.userId],
    references: [users.id]
  })
}));

// Notification Schema types
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertNotificationRuleSchema = createInsertSchema(notificationRules);
export const insertUserNotificationPreferenceSchema = createInsertSchema(userNotificationPreferences);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type NotificationRule = typeof notificationRules.$inferSelect;
export type InsertNotificationRule = z.infer<typeof insertNotificationRuleSchema>;
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreference = z.infer<typeof insertUserNotificationPreferenceSchema>;

// AI Schema types
export type AiConfiguration = typeof aiConfigurations.$inferSelect;
export type InsertAiConfiguration = z.infer<typeof insertAiConfigurationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// ===== ENHANCED WORK ORDERS RELATIONS (Critical for AI data retrieval) =====
export const workOrdersRelationsEnhanced = relations(workOrders, ({ one, many }) => ({
  // Customer relationship
  customer: one(customers, {
    fields: [workOrders.customerId],
    references: [customers.id],
  }),
  
  // Quotation relationship (optional)
  quotation: one(quotations, {
    fields: [workOrders.quotationId],
    references: [quotations.id],
  }),
  
  // Work Type relationship
  workType: one(workTypes, {
    fields: [workOrders.workTypeId],
    references: [workTypes.id],
  }),
  
  // Tenant relationship
  tenant: one(tenants, {
    fields: [workOrders.tenantId],
    references: [tenants.id],
  }),
  
  // Sub Jobs relationship (one-to-many)
  subJobs: many(subJobs),
  
  // Work Order Items relationship (one-to-many) 
  items: many(workOrderItems),
  
  // Attachments relationship (one-to-many)
  attachments: many(workOrderAttachments),
}));

// Enhanced Sub Jobs Relations
export const subJobsRelationsEnhanced = relations(subJobs, ({ one, many }) => ({
  // Work Order relationship (parent)
  workOrder: one(workOrders, {
    fields: [subJobs.workOrderId],
    references: [workOrders.id],
  }),
  
  // Department relationship
  department: one(departments, {
    fields: [subJobs.departmentId],
    references: [departments.id],
  }),
  
  // Work Step relationship
  workStep: one(workSteps, {
    fields: [subJobs.workStepId],
    references: [workSteps.id],
  }),
  
  // Color relationship
  color: one(colors, {
    fields: [subJobs.colorId],
    references: [colors.id],
  }),
  
  // Size relationship
  size: one(sizes, {
    fields: [subJobs.sizeId],
    references: [sizes.id],
  }),
  
  // Daily Work Logs relationship (one-to-many)
  dailyWorkLogs: many(dailyWorkLogs),
}));

// Enhanced Daily Work Logs Relations
export const dailyWorkLogsRelationsEnhanced = relations(dailyWorkLogs, ({ one }) => ({
  // Sub Job relationship (parent)
  subJob: one(subJobs, {
    fields: [dailyWorkLogs.subJobId],
    references: [subJobs.id],
  }),
  
  // Employee/User relationship
  employee: one(users, {
    fields: [dailyWorkLogs.employeeId],
    references: [users.id],
  }),
  
  // Team relationship
  team: one(teams, {
    fields: [dailyWorkLogs.teamId],
    references: [teams.id],
  }),
}));

// Enhanced Work Order Attachments Relations
export const workOrderAttachmentsRelationsEnhanced = relations(workOrderAttachments, ({ one }) => ({
  // Work Order relationship (parent)
  workOrder: one(workOrders, {
    fields: [workOrderAttachments.workOrderId],
    references: [workOrders.id],
  }),
  
  // User relationship (who uploaded)
  uploadedBy: one(users, {
    fields: [workOrderAttachments.uploadedBy],
    references: [users.id],
  }),
}));
