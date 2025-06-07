import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Users table with tenant association
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("user"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  category: text("category"),
  unit: text("unit").notNull().default("pcs"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Production orders table
export const productionOrders = pgTable("production_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Inventory table
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  maxStock: integer("max_stock"),
  location: text("location"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  updatedAt: timestamp("updated_at").defaultNow()
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
  category: text("category"), // เสื้อผ้า, รองเท้า, หมวก
  sortOrder: integer("sort_order").default(0),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  productionOrders: many(productionOrders),
  inventory: many(inventory),
  transactions: many(transactions),
  activities: many(activities),
  customers: many(customers),
  colors: many(colors),
  sizes: many(sizes)
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
  productionOrders: many(productionOrders),
  inventory: many(inventory)
}));

export const productionOrdersRelations = relations(productionOrders, ({ one }) => ({
  tenant: one(tenants, {
    fields: [productionOrders.tenantId],
    references: [tenants.id]
  }),
  product: one(products, {
    fields: [productionOrders.productId],
    references: [products.id]
  })
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inventory.tenantId],
    references: [tenants.id]
  }),
  product: one(products, {
    fields: [inventory.productId],
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

export const customersRelations = relations(customers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id]
  })
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

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductionOrderSchema = createInsertSchema(productionOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  updatedAt: true
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

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = z.infer<typeof insertProductionOrderSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

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
