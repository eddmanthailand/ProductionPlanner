import {
  users,
  tenants,
  products,
  productionOrders,
  inventory,
  transactions,
  activities,
  customers,
  colors,
  sizes,
  type User,
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Product,
  type InsertProduct,
  type ProductionOrder,
  type InsertProductionOrder,
  type Inventory,
  type InsertInventory,
  type Transaction,
  type InsertTransaction,
  type Activity,
  type InsertActivity
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<User[]>;

  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenants(): Promise<Tenant[]>;

  // Products
  getProducts(tenantId: string): Promise<Product[]>;
  getProduct(id: number, tenantId: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>, tenantId: string): Promise<Product | undefined>;
  deleteProduct(id: number, tenantId: string): Promise<boolean>;

  // Production Orders
  getProductionOrders(tenantId: string): Promise<ProductionOrder[]>;
  getProductionOrder(id: number, tenantId: string): Promise<ProductionOrder | undefined>;
  createProductionOrder(order: InsertProductionOrder): Promise<ProductionOrder>;
  updateProductionOrder(id: number, order: Partial<InsertProductionOrder>, tenantId: string): Promise<ProductionOrder | undefined>;

  // Inventory
  getInventory(tenantId: string): Promise<Inventory[]>;
  getInventoryByProduct(productId: number, tenantId: string): Promise<Inventory | undefined>;
  updateInventory(inventory: InsertInventory): Promise<Inventory>;

  // Transactions
  getTransactions(tenantId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;

  // Activities
  getActivities(tenantId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Dashboard metrics
  getDashboardMetrics(tenantId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).where(eq(tenants.isActive, true));
  }

  async getProducts(tenantId: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));
  }

  async getProduct(id: number, tenantId: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>, tenantId: string): Promise<Product | undefined> {
    const [product] = await db.update(products)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number, tenantId: string): Promise<boolean> {
    const result = await db.update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
    return result.rowCount > 0;
  }

  async getProductionOrders(tenantId: string): Promise<ProductionOrder[]> {
    return await db.select().from(productionOrders)
      .where(eq(productionOrders.tenantId, tenantId))
      .orderBy(desc(productionOrders.createdAt));
  }

  async getProductionOrder(id: number, tenantId: string): Promise<ProductionOrder | undefined> {
    const [order] = await db.select().from(productionOrders)
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)));
    return order || undefined;
  }

  async createProductionOrder(insertOrder: InsertProductionOrder): Promise<ProductionOrder> {
    const [order] = await db.insert(productionOrders).values(insertOrder).returning();
    return order;
  }

  async updateProductionOrder(id: number, updateData: Partial<InsertProductionOrder>, tenantId: string): Promise<ProductionOrder | undefined> {
    const [order] = await db.update(productionOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(productionOrders.id, id), eq(productionOrders.tenantId, tenantId)))
      .returning();
    return order || undefined;
  }

  async getInventory(tenantId: string): Promise<Inventory[]> {
    return await db.select().from(inventory)
      .where(eq(inventory.tenantId, tenantId));
  }

  async getInventoryByProduct(productId: number, tenantId: string): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.tenantId, tenantId)));
    return item || undefined;
  }

  async updateInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const existing = await this.getInventoryByProduct(insertInventory.productId!, insertInventory.tenantId!);
    
    if (existing) {
      const [updated] = await db.update(inventory)
        .set({ ...insertInventory, updatedAt: new Date() })
        .where(eq(inventory.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(inventory).values(insertInventory).returning();
      return created;
    }
  }

  async getTransactions(tenantId: string): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getTransactionsByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(and(
        eq(transactions.tenantId, tenantId),
        sql`${transactions.date} >= ${startDate}`,
        sql`${transactions.date} <= ${endDate}`
      ))
      .orderBy(desc(transactions.date));
  }

  async getActivities(tenantId: string, limit: number = 50): Promise<Activity[]> {
    return await db.select().from(activities)
      .where(eq(activities.tenantId, tenantId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  async getDashboardMetrics(tenantId: string): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month transactions
    const currentMonthTransactions = await this.getTransactionsByDateRange(tenantId, startOfMonth, now);
    const lastMonthTransactions = await this.getTransactionsByDateRange(tenantId, startOfLastMonth, endOfLastMonth);

    // Calculate revenue and expenses
    const currentRevenue = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const lastRevenue = lastMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const currentExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Get production orders
    const orders = await this.getProductionOrders(tenantId);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;

    // Get inventory count
    const inventoryItems = await this.getInventory(tenantId);
    const lowStockItems = inventoryItems.filter(i => i.quantity <= i.minStock).length;

    // Get active users count
    const activeUsers = await this.getUsersByTenant(tenantId);

    return {
      revenue: {
        current: currentRevenue,
        growth: lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0
      },
      expenses: currentExpenses,
      profit: currentRevenue - currentExpenses,
      pendingOrders,
      activeUsers: activeUsers.filter(u => u.isActive).length,
      lowStockItems,
      inventoryValue: inventoryItems.reduce((sum, item) => {
        return sum + (item.quantity * 100); // Approximate value
      }, 0)
    };
  }
}

export const storage = new DatabaseStorage();
