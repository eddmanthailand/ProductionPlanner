import {
  users,
  tenants,
  products,
  stockMovements,
  transactions,
  activities,
  customers,
  colors,
  sizes,
  workTypes,
  quotations,
  quotationItems,
  departments,
  teams,
  employees,
  workSteps,
  productionCapacity,
  workQueue,
  holidays,
  workOrders,
  workOrderItems,
  subJobs,
  productionPlans,
  productionPlanItems,
  dailyWorkLogs,
  replitAuthUsers,
  roles,
  permissions,
  rolePermissions,
  type User,
  type InsertUser,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type UserWithRole,
  type Tenant,
  type InsertTenant,
  type ReplitAuthUser,
  type UpsertReplitAuthUser,
  type Product,
  type InsertProduct,
  type StockMovement,
  type InsertStockMovement,
  type Transaction,
  type InsertTransaction,
  type Activity,
  type InsertActivity,
  type Customer,
  type InsertCustomer,
  type Color,
  type InsertColor,
  type Size,
  type InsertSize,
  type WorkType,
  type InsertWorkType,
  type Quotation,
  type InsertQuotation,
  type QuotationItem,
  type InsertQuotationItem,
  type Department,
  type InsertDepartment,
  type Team,
  type InsertTeam,
  type Employee,
  type InsertEmployee,
  type WorkStep,
  type InsertWorkStep,
  type ProductionCapacity,
  type InsertProductionCapacity,
  type WorkQueue,
  type InsertWorkQueue,
  type Holiday,
  type InsertHoliday,
  type WorkOrder,
  type InsertWorkOrder,
  type WorkOrderItem,
  type InsertWorkOrderItem,
  type SubJob,
  type InsertSubJob,
  type ProductionPlan,
  type InsertProductionPlan,
  type ProductionPlanItem,
  type InsertProductionPlanItem,
  type DailyWorkLog,
  type InsertDailyWorkLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, asc, gte, lte, sum, count, like, ilike, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Replit Auth Users (required for Replit Auth)
  getReplitAuthUser(id: string): Promise<ReplitAuthUser | undefined>;
  upsertReplitAuthUser(user: UpsertReplitAuthUser): Promise<ReplitAuthUser>;

  // Internal Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>, tenantId: string): Promise<User | undefined>;
  deleteUser(id: number, tenantId: string): Promise<boolean>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  getUsersWithRoles(tenantId: string): Promise<UserWithRole[]>;

  // Roles and Permissions
  getRoles(tenantId: string): Promise<Role[]>;
  getRole(id: number, tenantId: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, role: Partial<InsertRole>, tenantId: string): Promise<Role | undefined>;
  deleteRole(id: number, tenantId: string): Promise<boolean>;
  initializePredefinedRoles(tenantId: string): Promise<Role[]>;
  
  getPermissions(): Promise<Permission[]>;
  getUserPermissions(userId: number): Promise<Permission[]>;
  checkUserPermission(userId: number, resource: string, action: string): Promise<boolean>;
  getRolePermissions(roleId: number): Promise<Permission[]>;
  assignPermissionToRole(roleId: number, permissionId: number): Promise<void>;
  removePermissionFromRole(roleId: number, permissionId: number): Promise<void>;

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



  // Stock Management
  getStockMovements(tenantId: string): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;
  getProductStock(productId: number, tenantId: string): Promise<number>;

  // Transactions
  getTransactions(tenantId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;

  // Activities
  getActivities(tenantId: string, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Dashboard metrics
  getDashboardMetrics(tenantId: string): Promise<any>;

  // Customers
  getCustomers(tenantId: string): Promise<Customer[]>;
  getCustomer(id: number, tenantId: string): Promise<Customer | undefined>;
  getCustomerByTaxId(taxId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>, tenantId: string): Promise<Customer | undefined>;
  deleteCustomer(id: number, tenantId: string): Promise<boolean>;

  // Colors
  getColors(tenantId: string): Promise<Color[]>;
  getColor(id: number, tenantId: string): Promise<Color | undefined>;
  createColor(color: InsertColor): Promise<Color>;
  updateColor(id: number, color: Partial<InsertColor>, tenantId: string): Promise<Color | undefined>;
  deleteColor(id: number, tenantId: string): Promise<boolean>;

  // Sizes
  getSizes(tenantId: string): Promise<Size[]>;
  getSize(id: number, tenantId: string): Promise<Size | undefined>;
  createSize(size: InsertSize): Promise<Size>;
  updateSize(id: number, size: Partial<InsertSize>, tenantId: string): Promise<Size | undefined>;
  deleteSize(id: number, tenantId: string): Promise<boolean>;

  // Work Types
  getWorkTypes(tenantId: string): Promise<WorkType[]>;
  getWorkType(id: number, tenantId: string): Promise<WorkType | undefined>;
  createWorkType(workType: InsertWorkType): Promise<WorkType>;
  updateWorkType(id: number, workType: Partial<InsertWorkType>, tenantId: string): Promise<WorkType | undefined>;
  deleteWorkType(id: number, tenantId: string): Promise<boolean>;

  // Quotations
  getQuotations(tenantId: string): Promise<Quotation[]>;
  getQuotation(id: number, tenantId: string): Promise<Quotation | undefined>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: number, quotation: Partial<InsertQuotation>, tenantId: string): Promise<Quotation | undefined>;
  deleteQuotation(id: number, tenantId: string): Promise<boolean>;

  // Departments
  getDepartments(tenantId: string): Promise<Department[]>;
  getDepartment(id: string, tenantId: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>, tenantId: string): Promise<Department | undefined>;
  deleteDepartment(id: string, tenantId: string): Promise<boolean>;

  // Teams
  getTeams(tenantId: string): Promise<Team[]>;
  getTeamsByDepartment(departmentId: string, tenantId: string): Promise<Team[]>;
  getTeam(id: string, tenantId: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, team: Partial<InsertTeam>, tenantId: string): Promise<Team | undefined>;
  deleteTeam(id: string, tenantId: string): Promise<boolean>;

  // Work Steps
  getWorkSteps(tenantId: string): Promise<WorkStep[]>;
  getWorkStepsByDepartment(departmentId: string, tenantId: string): Promise<WorkStep[]>;
  getWorkStep(id: string, tenantId: string): Promise<WorkStep | undefined>;
  createWorkStep(workStep: InsertWorkStep): Promise<WorkStep>;
  updateWorkStep(id: string, workStep: Partial<InsertWorkStep>, tenantId: string): Promise<WorkStep | undefined>;
  deleteWorkStep(id: string, tenantId: string): Promise<boolean>;

  // Employees
  getEmployees(tenantId: string): Promise<Employee[]>;
  getEmployeesByTeam(teamId: string, tenantId: string): Promise<Employee[]>;
  getEmployee(id: string, tenantId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>, tenantId: string): Promise<Employee | undefined>;
  deleteEmployee(id: string, tenantId: string): Promise<boolean>;

  // Production Capacity
  getProductionCapacities(tenantId: string): Promise<ProductionCapacity[]>;
  getProductionCapacityByTeam(teamId: string, tenantId: string): Promise<ProductionCapacity | undefined>;
  createProductionCapacity(capacity: InsertProductionCapacity): Promise<ProductionCapacity>;
  updateProductionCapacity(id: string, capacity: Partial<InsertProductionCapacity>, tenantId: string): Promise<ProductionCapacity | undefined>;
  deleteProductionCapacity(id: string, tenantId: string): Promise<boolean>;

  // Work Queue
  getWorkQueues(tenantId: string): Promise<WorkQueue[]>;
  getWorkQueuesByTeam(teamId: string, tenantId: string): Promise<any[]>;
  getWorkQueue(id: string, tenantId: string): Promise<WorkQueue | undefined>;
  createWorkQueue(workQueue: InsertWorkQueue): Promise<WorkQueue>;
  updateWorkQueue(id: string, workQueue: Partial<InsertWorkQueue>, tenantId: string): Promise<WorkQueue | undefined>;
  deleteWorkQueue(id: string, tenantId: string): Promise<boolean>;

  // Holidays
  getHolidays(tenantId: string): Promise<Holiday[]>;
  getHolidaysByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  deleteHoliday(id: string, tenantId: string): Promise<boolean>;

  // Work Orders
  getWorkOrders(tenantId: string): Promise<WorkOrder[]>;
  getWorkOrder(id: string, tenantId: string): Promise<WorkOrder | undefined>;
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: string, workOrder: Partial<InsertWorkOrder>, tenantId: string): Promise<WorkOrder | undefined>;
  deleteWorkOrder(id: string, tenantId: string): Promise<boolean>;

  // Work Order Items
  getWorkOrderItems(workOrderId: string): Promise<WorkOrderItem[]>;
  createWorkOrderItem(item: InsertWorkOrderItem): Promise<WorkOrderItem>;
  updateWorkOrderItem(id: number, item: Partial<InsertWorkOrderItem>): Promise<WorkOrderItem | undefined>;
  deleteWorkOrderItem(id: number): Promise<boolean>;

  // Production Plans
  getProductionPlans(tenantId: string): Promise<ProductionPlan[]>;
  getProductionPlansByTeam(teamId: string, tenantId: string): Promise<ProductionPlan[]>;
  getProductionPlan(id: string, tenantId: string): Promise<ProductionPlan | undefined>;
  createProductionPlan(plan: InsertProductionPlan): Promise<ProductionPlan>;
  updateProductionPlan(id: string, plan: Partial<InsertProductionPlan>, tenantId: string): Promise<ProductionPlan | undefined>;
  deleteProductionPlan(id: string, tenantId: string): Promise<boolean>;

  // Production Plan Items
  getProductionPlanItems(planId: string): Promise<ProductionPlanItem[]>;
  createProductionPlanItem(item: InsertProductionPlanItem): Promise<ProductionPlanItem>;
  updateProductionPlanItem(id: number, item: Partial<InsertProductionPlanItem>): Promise<ProductionPlanItem | undefined>;
  deleteProductionPlanItem(id: number): Promise<boolean>;

  // Daily Work Logs
  getDailyWorkLogs(tenantId: string, filters?: { 
    date?: string; 
    teamId?: string; 
    dateFrom?: string; 
    dateTo?: string; 
    workOrderId?: string; 
    status?: string; 
    employeeName?: string; 
    limit?: number; 
  }): Promise<DailyWorkLog[]>;
  createDailyWorkLog(log: InsertDailyWorkLog): Promise<DailyWorkLog>;
  updateDailyWorkLog(id: string, log: Partial<InsertDailyWorkLog>, tenantId: string): Promise<DailyWorkLog | undefined>;
  deleteDailyWorkLog(id: string, tenantId: string): Promise<boolean>;
  getSubJobsByWorkOrder(workOrderId: string): Promise<SubJob[]>;
}

export class DatabaseStorage implements IStorage {
  // Replit Auth Users implementation
  async getReplitAuthUser(id: string): Promise<ReplitAuthUser | undefined> {
    const [user] = await db.select().from(replitAuthUsers).where(eq(replitAuthUsers.id, id));
    return user || undefined;
  }

  async upsertReplitAuthUser(userData: UpsertReplitAuthUser): Promise<ReplitAuthUser> {
    const [user] = await db
      .insert(replitAuthUsers)
      .values(userData)
      .onConflictDoUpdate({
        target: replitAuthUsers.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Internal Users implementation
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

  async updateUser(id: number, updateData: Partial<InsertUser>, tenantId: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number, tenantId: string): Promise<boolean> {
    const result = await db.update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  async getUsersWithRoles(tenantId: string): Promise<UserWithRole[]> {
    const result = await db.select()
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)));
    
    return result.map(row => ({
      id: row.users.id,
      username: row.users.username,
      email: row.users.email,
      firstName: row.users.firstName,
      lastName: row.users.lastName,
      password: '', // Don't expose password
      roleId: row.users.roleId,
      tenantId: row.users.tenantId,
      isActive: row.users.isActive,
      lastLoginAt: row.users.lastLoginAt,
      deletedAt: row.users.deletedAt,
      createdAt: row.users.createdAt,
      updatedAt: row.users.updatedAt,
      role: row.roles ? {
        id: row.roles.id,
        name: row.roles.name,
        displayName: row.roles.displayName,
        description: row.roles.description,
        level: row.roles.level,
        tenantId: row.roles.tenantId,
        isActive: row.roles.isActive,
        createdAt: row.roles.createdAt,
        updatedAt: row.roles.updatedAt
      } : undefined
    }));
  }

  // Roles and Permissions implementation
  async getRoles(tenantId: string): Promise<Role[]> {
    return await db.select().from(roles)
      .where(and(eq(roles.tenantId, tenantId), eq(roles.isActive, true)))
      .orderBy(roles.level);
  }

  async getRole(id: number, tenantId: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles)
      .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(insertRole).returning();
    return role;
  }

  async updateRole(id: number, updateData: Partial<InsertRole>, tenantId: string): Promise<Role | undefined> {
    const [role] = await db.update(roles)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)))
      .returning();
    return role || undefined;
  }

  async deleteRole(id: number, tenantId: string): Promise<boolean> {
    const result = await db.update(roles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(roles.id, id), eq(roles.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  async initializePredefinedRoles(tenantId: string): Promise<Role[]> {
    const { PREDEFINED_ROLES } = await import("@shared/schema");
    const createdRoles: Role[] = [];
    
    for (const predefinedRole of PREDEFINED_ROLES) {
      try {
        const [existingRole] = await db.select().from(roles)
          .where(and(eq(roles.name, predefinedRole.name), eq(roles.tenantId, tenantId)));
          
        if (!existingRole) {
          const [role] = await db.insert(roles).values({
            name: predefinedRole.name,
            displayName: predefinedRole.displayName,
            description: predefinedRole.description,
            level: predefinedRole.level,
            tenantId: tenantId,
            isActive: true
          }).returning();
          createdRoles.push(role);
        }
      } catch (error) {
        console.error(`Failed to create role ${predefinedRole.name}:`, error);
      }
    }
    
    return createdRoles;
  }

  async getPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(permissions.resource, permissions.action);
  }

  async getUserPermissions(userId: number): Promise<Permission[]> {
    const result = await db.select({
      id: permissions.id,
      name: permissions.name,
      resource: permissions.resource,
      action: permissions.action,
      description: permissions.description,
      createdAt: permissions.createdAt
    })
    .from(permissions)
    .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(users, eq(roles.id, users.roleId))
    .where(eq(users.id, userId));
    
    return result;
  }

  async checkUserPermission(userId: number, resource: string, action: string): Promise<boolean> {
    const result = await db.select({ count: sql<number>`count(*)` })
    .from(permissions)
    .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .innerJoin(users, eq(roles.id, users.roleId))
    .where(and(
      eq(users.id, userId),
      eq(permissions.resource, resource),
      eq(permissions.action, action)
    ));
    
    return (result[0]?.count ?? 0) > 0;
  }

  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const result = await db.select({
      id: permissions.id,
      name: permissions.name,
      resource: permissions.resource,
      action: permissions.action,
      description: permissions.description,
      createdAt: permissions.createdAt
    })
    .from(permissions)
    .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
    
    return result;
  }

  async assignPermissionToRole(roleId: number, permissionId: number): Promise<void> {
    await db.insert(rolePermissions).values({
      roleId,
      permissionId
    });
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    await db.delete(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      ));
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
    return (result.rowCount ?? 0) > 0;
  }



  async getStockMovements(tenantId: string): Promise<StockMovement[]> {
    return await db.select().from(stockMovements)
      .where(eq(stockMovements.tenantId, tenantId))
      .orderBy(desc(stockMovements.createdAt));
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [created] = await db.insert(stockMovements).values(movement).returning();
    
    // Update product stock if it's a stock product
    if (movement.productId && movement.tenantId) {
      const currentStock = await this.getProductStock(movement.productId, movement.tenantId);
      const newStock = movement.type === 'in' ? 
        currentStock + movement.quantity : 
        currentStock - movement.quantity;
      
      await db.update(products)
        .set({ currentStock: Math.max(0, newStock) })
        .where(and(eq(products.id, movement.productId), eq(products.tenantId, movement.tenantId)));
    }
    
    return created;
  }

  async getProductStock(productId: number, tenantId: string): Promise<number> {
    const [product] = await db.select({ currentStock: products.currentStock })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));
    
    return product?.currentStock || 0;
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

    // Production orders removed - using work orders instead
    const pendingOrders = 0;

    // Get products with stock tracking
    const allProducts = await this.getProducts(tenantId);
    const stockProducts = allProducts.filter(p => p.type === 'stock_product');
    const lowStockItems = stockProducts.filter(p => (p.currentStock || 0) <= (p.minStock || 0)).length;

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
      inventoryValue: stockProducts.reduce((sum: number, item: any) => {
        return sum + ((item.currentStock || 0) * (parseFloat(item.cost) || 0));
      }, 0)
    };
  }

  // Customers methods
  async getCustomers(tenantId: string): Promise<Customer[]> {
    console.log('Storage: Getting customers for tenant:', tenantId);
    try {
      // Use simple select without orderBy to avoid potential issues
      const result = await db.select().from(customers).where(eq(customers.tenantId, tenantId));
      console.log('Storage: Found customers:', result.length);
      return result;
    } catch (error) {
      console.error('Storage: Error getting customers:', error);
      throw error;
    }
  }

  async getCustomer(id: number, tenantId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(
      and(eq(customers.id, id), eq(customers.tenantId, tenantId))
    );
    return customer || undefined;
  }

  async getCustomerByTaxId(taxId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.taxId, taxId));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: number, updateData: Partial<InsertCustomer>, tenantId: string): Promise<Customer | undefined> {
    const [customer] = await db.update(customers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();
    return customer || undefined;
  }

  async deleteCustomer(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(customers).where(
      and(eq(customers.id, id), eq(customers.tenantId, tenantId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Colors methods
  async getColors(tenantId: string): Promise<Color[]> {
    return await db.select().from(colors).where(eq(colors.tenantId, tenantId)).orderBy(asc(colors.sortOrder), asc(colors.id));
  }

  async getColor(id: number, tenantId: string): Promise<Color | undefined> {
    const [color] = await db.select().from(colors).where(
      and(eq(colors.id, id), eq(colors.tenantId, tenantId))
    );
    return color || undefined;
  }

  async createColor(insertColor: InsertColor): Promise<Color> {
    const [color] = await db.insert(colors).values(insertColor).returning();
    return color;
  }

  async updateColor(id: number, updateData: Partial<InsertColor>, tenantId: string): Promise<Color | undefined> {
    const [color] = await db.update(colors)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(colors.id, id), eq(colors.tenantId, tenantId)))
      .returning();
    return color || undefined;
  }

  async deleteColor(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(colors).where(
      and(eq(colors.id, id), eq(colors.tenantId, tenantId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Sizes methods
  async getSizes(tenantId: string): Promise<Size[]> {
    return await db.select().from(sizes).where(eq(sizes.tenantId, tenantId)).orderBy(asc(sizes.sortOrder), asc(sizes.name));
  }

  async getSize(id: number, tenantId: string): Promise<Size | undefined> {
    const [size] = await db.select().from(sizes).where(
      and(eq(sizes.id, id), eq(sizes.tenantId, tenantId))
    );
    return size || undefined;
  }

  async createSize(insertSize: InsertSize): Promise<Size> {
    const [size] = await db.insert(sizes).values(insertSize).returning();
    return size;
  }

  async updateSize(id: number, updateData: Partial<InsertSize>, tenantId: string): Promise<Size | undefined> {
    const [size] = await db.update(sizes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(sizes.id, id), eq(sizes.tenantId, tenantId)))
      .returning();
    return size || undefined;
  }

  async deleteSize(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(sizes).where(
      and(eq(sizes.id, id), eq(sizes.tenantId, tenantId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Work Types methods
  async getWorkTypes(tenantId: string): Promise<WorkType[]> {
    return await db.select().from(workTypes).where(eq(workTypes.tenantId, tenantId)).orderBy(asc(workTypes.sortOrder), asc(workTypes.id));
  }

  async getWorkType(id: number, tenantId: string): Promise<WorkType | undefined> {
    const [workType] = await db.select().from(workTypes).where(
      and(eq(workTypes.id, id), eq(workTypes.tenantId, tenantId))
    );
    return workType || undefined;
  }

  async createWorkType(insertWorkType: InsertWorkType): Promise<WorkType> {
    const [workType] = await db.insert(workTypes).values(insertWorkType).returning();
    return workType;
  }

  async updateWorkType(id: number, updateData: Partial<InsertWorkType>, tenantId: string): Promise<WorkType | undefined> {
    const [workType] = await db.update(workTypes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(workTypes.id, id), eq(workTypes.tenantId, tenantId)))
      .returning();
    return workType || undefined;
  }

  async deleteWorkType(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(workTypes).where(
      and(eq(workTypes.id, id), eq(workTypes.tenantId, tenantId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Quotations
  async getQuotations(tenantId: string): Promise<Quotation[]> {
    return await db.query.quotations.findMany({
      where: eq(quotations.tenantId, tenantId),
      with: {
        customer: true,
        items: {
          with: {
            product: true
          }
        }
      },
      orderBy: [desc(quotations.createdAt)]
    });
  }

  async getQuotation(id: number, tenantId: string): Promise<Quotation | undefined> {
    const [quotation] = await db.query.quotations.findMany({
      where: and(eq(quotations.id, id), eq(quotations.tenantId, tenantId)),
      with: {
        customer: true,
        items: {
          with: {
            product: true
          }
        }
      }
    });
    return quotation || undefined;
  }

  async createQuotation(insertQuotation: InsertQuotation): Promise<Quotation> {
    const { items, ...quotationData } = insertQuotation as any;
    
    // Create quotation first
    const [quotation] = await db
      .insert(quotations)
      .values(quotationData)
      .returning();

    // Create quotation items if provided
    if (items && items.length > 0) {
      const itemsData = items.map((item: any) => ({
        ...item,
        quotationId: quotation.id
      }));
      
      await db.insert(quotationItems).values(itemsData);
    }

    // Return full quotation with relations
    return await this.getQuotation(quotation.id, quotation.tenantId) as Quotation;
  }

  async updateQuotation(id: number, updateData: Partial<InsertQuotation>, tenantId: string): Promise<Quotation | undefined> {
    const { items, ...quotationData } = updateData as any;
    
    // Update quotation
    const [quotation] = await db
      .update(quotations)
      .set(quotationData)
      .where(and(eq(quotations.id, id), eq(quotations.tenantId, tenantId)))
      .returning();

    if (!quotation) return undefined;

    // Update items if provided
    if (items) {
      // Delete existing items
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, id));
      
      // Insert new items
      if (items.length > 0) {
        const itemsData = items.map((item: any) => ({
          ...item,
          quotationId: id
        }));
        
        await db.insert(quotationItems).values(itemsData);
      }
    }

    // Return updated quotation with relations
    return await this.getQuotation(id, tenantId);
  }

  async deleteQuotation(id: number, tenantId: string): Promise<boolean> {
    const result = await db.delete(quotations).where(
      and(eq(quotations.id, id), eq(quotations.tenantId, tenantId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Department methods
  async getDepartments(tenantId: string): Promise<Department[]> {
    return await db.select().from(departments).where(eq(departments.tenantId, tenantId));
  }

  async getDepartment(id: string, tenantId: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(
      and(eq(departments.id, id), eq(departments.tenantId, tenantId))
    );
    return department || undefined;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values({
        ...insertDepartment,
        id: nanoid()
      })
      .returning();
    return department;
  }

  async updateDepartment(id: string, updateData: Partial<InsertDepartment>, tenantId: string): Promise<Department | undefined> {
    const [department] = await db
      .update(departments)
      .set(updateData)
      .where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)))
      .returning();
    return department || undefined;
  }

  async deleteDepartment(id: string, tenantId: string): Promise<boolean> {
    const result = await db.delete(departments).where(
      and(eq(departments.id, id), eq(departments.tenantId, tenantId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Team methods
  async getTeams(tenantId: string): Promise<any[]> {
    return await db
      .select()
      .from(teams)
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(eq(departments.tenantId, tenantId))
      .then(rows => rows.map(row => ({
        ...row.teams,
        cost_per_day: row.teams.costPerDay
      })));
  }

  async getTeamsByDepartment(departmentId: string, tenantId: string): Promise<Team[]> {
    return await db
      .select()
      .from(teams)
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(and(eq(teams.departmentId, departmentId), eq(departments.tenantId, tenantId)))
      .then(rows => rows.map(row => row.teams));
  }

  async getTeam(id: string, tenantId: string): Promise<Team | undefined> {
    const [result] = await db
      .select()
      .from(teams)
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(and(eq(teams.id, id), eq(departments.tenantId, tenantId)));
    return result?.teams || undefined;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values({
        ...insertTeam,
        id: nanoid()
      })
      .returning();
    return team;
  }

  async updateTeam(id: string, updateData: Partial<InsertTeam>, tenantId: string): Promise<Team | undefined> {
    const [result] = await db
      .update(teams)
      .set(updateData)
      .where(
        and(
          eq(teams.id, id),
          sql`${teams.departmentId} IN (SELECT id FROM ${departments} WHERE tenant_id = ${tenantId})`
        )
      )
      .returning();
    return result || undefined;
  }

  async deleteTeam(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(teams)
      .where(
        and(
          eq(teams.id, id),
          sql`${teams.departmentId} IN (SELECT id FROM ${departments} WHERE tenant_id = ${tenantId})`
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // Work Steps methods
  async getWorkSteps(tenantId: string): Promise<WorkStep[]> {
    return await db
      .select()
      .from(workSteps)
      .innerJoin(departments, eq(workSteps.departmentId, departments.id))
      .where(eq(departments.tenantId, tenantId))
      .orderBy(asc(workSteps.order))
      .then(rows => rows.map(row => row.work_steps));
  }

  async getWorkStepsByDepartment(departmentId: string, tenantId: string): Promise<WorkStep[]> {
    return await db
      .select()
      .from(workSteps)
      .innerJoin(departments, eq(workSteps.departmentId, departments.id))
      .where(and(eq(workSteps.departmentId, departmentId), eq(departments.tenantId, tenantId)))
      .orderBy(asc(workSteps.order))
      .then(rows => rows.map(row => row.work_steps));
  }

  async getWorkStep(id: string, tenantId: string): Promise<WorkStep | undefined> {
    const [result] = await db
      .select()
      .from(workSteps)
      .innerJoin(departments, eq(workSteps.departmentId, departments.id))
      .where(and(eq(workSteps.id, id), eq(departments.tenantId, tenantId)));
    return result?.work_steps || undefined;
  }

  async createWorkStep(insertWorkStep: InsertWorkStep): Promise<WorkStep> {
    const [workStep] = await db
      .insert(workSteps)
      .values({
        ...insertWorkStep,
        id: nanoid()
      })
      .returning();
    return workStep;
  }

  async updateWorkStep(id: string, updateData: Partial<InsertWorkStep>, tenantId: string): Promise<WorkStep | undefined> {
    const [result] = await db
      .update(workSteps)
      .set(updateData)
      .where(
        and(
          eq(workSteps.id, id),
          sql`${workSteps.departmentId} IN (SELECT id FROM ${departments} WHERE tenant_id = ${tenantId})`
        )
      )
      .returning();
    return result || undefined;
  }

  async deleteWorkStep(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(workSteps)
      .where(
        and(
          eq(workSteps.id, id),
          sql`${workSteps.departmentId} IN (SELECT id FROM ${departments} WHERE tenant_id = ${tenantId})`
        )
      );
    return (result.rowCount ?? 0) > 0;
  }

  // Employee methods
  async getEmployees(tenantId: string): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
      .orderBy(employees.createdAt);
  }

  async getEmployeesByTeam(teamId: string, tenantId: string): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(and(eq(employees.teamId, teamId), eq(employees.tenantId, tenantId)))
      .orderBy(employees.createdAt);
  }

  async getEmployee(id: string, tenantId: string): Promise<Employee | undefined> {
    const [result] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
    return result || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values({
        ...insertEmployee,
        id: nanoid()
      })
      .returning();
    return employee;
  }

  async updateEmployee(id: string, updateData: Partial<InsertEmployee>, tenantId: string): Promise<Employee | undefined> {
    const [result] = await db
      .update(employees)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .returning();
    return result || undefined;
  }

  async deleteEmployee(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(employees)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Production Capacity methods
  async getProductionCapacities(tenantId: string): Promise<ProductionCapacity[]> {
    return await db
      .select()
      .from(productionCapacity)
      .where(eq(productionCapacity.tenantId, tenantId))
      .orderBy(asc(productionCapacity.createdAt));
  }

  async getProductionCapacityByTeam(teamId: string, tenantId: string): Promise<ProductionCapacity | undefined> {
    const [result] = await db
      .select()
      .from(productionCapacity)
      .where(and(eq(productionCapacity.teamId, teamId), eq(productionCapacity.tenantId, tenantId)));
    return result || undefined;
  }

  async createProductionCapacity(insertCapacity: InsertProductionCapacity): Promise<ProductionCapacity> {
    const [capacity] = await db
      .insert(productionCapacity)
      .values({
        ...insertCapacity,
        id: nanoid()
      })
      .returning();
    return capacity;
  }

  async updateProductionCapacity(id: string, updateData: Partial<InsertProductionCapacity>, tenantId: string): Promise<ProductionCapacity | undefined> {
    const [result] = await db
      .update(productionCapacity)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(and(eq(productionCapacity.id, id), eq(productionCapacity.tenantId, tenantId)))
      .returning();
    return result || undefined;
  }

  async deleteProductionCapacity(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(productionCapacity)
      .where(and(eq(productionCapacity.id, id), eq(productionCapacity.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Work Queue methods
  async getWorkQueues(tenantId: string): Promise<WorkQueue[]> {
    return await db
      .select()
      .from(workQueue)
      .where(eq(workQueue.tenantId, tenantId))
      .orderBy(asc(workQueue.priority), asc(workQueue.createdAt));
  }

  async getWorkQueuesByTeam(teamId: string, tenantId: string): Promise<any[]> {
    // Join with sub_jobs to get proper data including sub_job_id and totalCost
    const result = await db
      .select({
        id: workQueue.subJobId, // Use sub_job_id as the main id for filtering
        queueId: workQueue.id,
        workOrderId: subJobs.workOrderId,
        orderNumber: workQueue.orderNumber,
        customerName: workOrders.customerName,
        productName: workQueue.productName,
        quantity: workQueue.quantity,
        colorId: subJobs.colorId,
        sizeId: subJobs.sizeId,
        workTypeId: subJobs.workStepId,
        deliveryDate: workOrders.deliveryDate,
        status: workQueue.status,
        notes: workQueue.notes,
        totalCost: subJobs.totalCost, // Add totalCost from sub_jobs
        createdAt: workQueue.createdAt,
        updatedAt: workQueue.updatedAt
      })
      .from(workQueue)
      .innerJoin(subJobs, eq(workQueue.subJobId, subJobs.id))
      .innerJoin(workOrders, eq(subJobs.workOrderId, workOrders.id))
      .where(and(eq(workQueue.teamId, teamId), eq(workQueue.tenantId, tenantId)))
      .orderBy(asc(workQueue.priority), asc(workQueue.createdAt));
    
    return result;
  }

  async getWorkQueue(id: string, tenantId: string): Promise<WorkQueue | undefined> {
    const [result] = await db
      .select()
      .from(workQueue)
      .where(and(eq(workQueue.id, id), eq(workQueue.tenantId, tenantId)));
    return result || undefined;
  }

  async createWorkQueue(insertWorkQueue: InsertWorkQueue): Promise<WorkQueue> {
    const [queue] = await db
      .insert(workQueue)
      .values({
        ...insertWorkQueue,
        id: nanoid()
      })
      .returning();
    return queue;
  }

  async updateWorkQueue(id: string, updateData: Partial<InsertWorkQueue>, tenantId: string): Promise<WorkQueue | undefined> {
    const [result] = await db
      .update(workQueue)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(and(eq(workQueue.id, id), eq(workQueue.tenantId, tenantId)))
      .returning();
    return result || undefined;
  }

  async deleteWorkQueue(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(workQueue)
      .where(and(eq(workQueue.id, id), eq(workQueue.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Holidays methods
  async getHolidays(tenantId: string): Promise<Holiday[]> {
    return await db
      .select()
      .from(holidays)
      .where(eq(holidays.tenantId, tenantId))
      .orderBy(asc(holidays.date));
  }

  async getHolidaysByDateRange(tenantId: string, startDate: Date, endDate: Date): Promise<Holiday[]> {
    return await db
      .select()
      .from(holidays)
      .where(and(
        eq(holidays.tenantId, tenantId),
        sql`${holidays.date} >= ${startDate.toISOString().split('T')[0]}`,
        sql`${holidays.date} <= ${endDate.toISOString().split('T')[0]}`
      ))
      .orderBy(asc(holidays.date));
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const [holiday] = await db
      .insert(holidays)
      .values({
        ...insertHoliday,
        id: nanoid()
      })
      .returning();
    return holiday;
  }

  async deleteHoliday(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(holidays)
      .where(and(eq(holidays.id, id), eq(holidays.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Work Orders methods
  async getWorkOrders(tenantId: string): Promise<WorkOrder[]> {
    return await db
      .select()
      .from(workOrders)
      .where(eq(workOrders.tenantId, tenantId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrder(id: string, tenantId: string): Promise<WorkOrder | undefined> {
    const [result] = await db
      .select()
      .from(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)));
    return result || undefined;
  }

  async createWorkOrder(insertWorkOrder: InsertWorkOrder): Promise<WorkOrder> {
    // Generate JB format order number (JB202506001)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Count orders for this month and year
    const monthlyCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(workOrders)
      .where(
        and(
          eq(workOrders.tenantId, insertWorkOrder.tenantId),
          sql`EXTRACT(YEAR FROM created_at) = ${year}`,
          sql`EXTRACT(MONTH FROM created_at) = ${parseInt(month)}`
        )
      );
    
    const sequence = String(monthlyCount[0].count + 1).padStart(3, '0');
    const orderNumber = `JB${year}${month}${sequence}`;

    // Get customer info if customerId is provided
    let customerData = {};
    if (insertWorkOrder.customerId) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, insertWorkOrder.customerId));
      
      if (customer) {
        customerData = {
          customerName: customer.name,
          customerTaxId: customer.taxId,
          customerAddress: customer.address,
          customerPhone: customer.phone,
          customerEmail: customer.email
        };
      }
    }

    // Get quotation total if quotationId is provided
    let totalAmount = "0.00";
    if (insertWorkOrder.quotationId) {
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, insertWorkOrder.quotationId));
      
      if (quotation) {
        totalAmount = quotation.grandTotal;
      }
    }

    const [workOrder] = await db
      .insert(workOrders)
      .values({
        ...insertWorkOrder,
        ...customerData,
        id: nanoid(),
        orderNumber,
        totalAmount
      })
      .returning();
    return workOrder;
  }

  async updateWorkOrder(id: string, updateData: Partial<InsertWorkOrder>, tenantId: string): Promise<WorkOrder | undefined> {
    const [result] = await db
      .update(workOrders)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)))
      .returning();
    return result || undefined;
  }

  async deleteWorkOrder(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(workOrders)
      .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Work Order Items methods
  async getWorkOrderItems(workOrderId: string): Promise<WorkOrderItem[]> {
    return await db
      .select()
      .from(workOrderItems)
      .where(eq(workOrderItems.workOrderId, workOrderId))
      .orderBy(asc(workOrderItems.id));
  }

  async createWorkOrderItem(insertItem: InsertWorkOrderItem): Promise<WorkOrderItem> {
    const [item] = await db
      .insert(workOrderItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateWorkOrderItem(id: number, updateData: Partial<InsertWorkOrderItem>): Promise<WorkOrderItem | undefined> {
    const [result] = await db
      .update(workOrderItems)
      .set(updateData)
      .where(eq(workOrderItems.id, id))
      .returning();
    return result || undefined;
  }

  async deleteWorkOrderItem(id: number): Promise<boolean> {
    const result = await db
      .delete(workOrderItems)
      .where(eq(workOrderItems.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Production Plans methods
  async getProductionPlans(tenantId: string): Promise<ProductionPlan[]> {
    try {
      const plans = await db
        .select()
        .from(productionPlans)
        .where(eq(productionPlans.tenantId, tenantId))
        .orderBy(desc(productionPlans.createdAt));
      return plans;
    } catch (error) {
      console.error('Get production plans error:', error);
      return [];
    }
  }

  async getProductionPlansByTeam(teamId: string, tenantId: string): Promise<ProductionPlan[]> {
    try {
      const plans = await db
        .select()
        .from(productionPlans)
        .where(and(
          eq(productionPlans.teamId, teamId),
          eq(productionPlans.tenantId, tenantId)
        ))
        .orderBy(desc(productionPlans.createdAt));
      return plans;
    } catch (error) {
      console.error('Get production plans by team error:', error);
      return [];
    }
  }

  async getProductionPlan(id: string, tenantId: string): Promise<ProductionPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(productionPlans)
        .where(and(
          eq(productionPlans.id, id),
          eq(productionPlans.tenantId, tenantId)
        ));
      return plan || undefined;
    } catch (error) {
      console.error('Get production plan error:', error);
      return undefined;
    }
  }

  async createProductionPlan(insertPlan: InsertProductionPlan): Promise<ProductionPlan> {
    const [plan] = await db
      .insert(productionPlans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updateProductionPlan(id: string, updateData: Partial<InsertProductionPlan>, tenantId: string): Promise<ProductionPlan | undefined> {
    try {
      const [updated] = await db
        .update(productionPlans)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(
          eq(productionPlans.id, id),
          eq(productionPlans.tenantId, tenantId)
        ))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Update production plan error:', error);
      return undefined;
    }
  }

  async deleteProductionPlan(id: string, tenantId: string): Promise<boolean> {
    try {
      // First, delete all production plan items for this plan
      await db
        .delete(productionPlanItems)
        .where(eq(productionPlanItems.planId, id));

      // Then delete the production plan
      const [deleted] = await db
        .delete(productionPlans)
        .where(and(
          eq(productionPlans.id, id),
          eq(productionPlans.tenantId, tenantId)
        ))
        .returning();
      return !!deleted;
    } catch (error) {
      console.error('Delete production plan error:', error);
      return false;
    }
  }

  // Production Plan Items methods
  async getProductionPlanItems(planId: string): Promise<ProductionPlanItem[]> {
    try {
      const items = await db
        .select()
        .from(productionPlanItems)
        .where(eq(productionPlanItems.planId, planId))
        .orderBy(productionPlanItems.priority);
      return items;
    } catch (error) {
      console.error('Get production plan items error:', error);
      return [];
    }
  }

  async createProductionPlanItem(insertItem: InsertProductionPlanItem): Promise<ProductionPlanItem> {
    const [item] = await db
      .insert(productionPlanItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateProductionPlanItem(id: number, updateData: Partial<InsertProductionPlanItem>): Promise<ProductionPlanItem | undefined> {
    try {
      const [updated] = await db
        .update(productionPlanItems)
        .set(updateData)
        .where(eq(productionPlanItems.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Update production plan item error:', error);
      return undefined;
    }
  }

  async deleteProductionPlanItem(id: number): Promise<boolean> {
    try {
      const [deleted] = await db
        .delete(productionPlanItems)
        .where(eq(productionPlanItems.id, id))
        .returning();
      return !!deleted;
    } catch (error) {
      console.error('Delete production plan item error:', error);
      return false;
    }
  }

  // Daily Work Logs methods
  async getDailyWorkLogs(tenantId: string, filters?: { 
    date?: string; 
    teamId?: string; 
    dateFrom?: string; 
    dateTo?: string; 
    workOrderId?: string; 
    status?: string; 
    employeeName?: string; 
    limit?: number; 
  }): Promise<DailyWorkLog[]> {
    try {
      console.log('Storage: Getting daily work logs with filters:', { tenantId, filters });
      
      const conditions = [eq(dailyWorkLogs.tenantId, tenantId)];

      if (filters?.date) {
        console.log('Storage: Adding date filter:', filters.date);
        conditions.push(eq(dailyWorkLogs.date, filters.date));
      }

      if (filters?.dateFrom) {
        console.log('Storage: Adding dateFrom filter:', filters.dateFrom);
        conditions.push(gte(dailyWorkLogs.date, filters.dateFrom));
      }

      if (filters?.dateTo) {
        console.log('Storage: Adding dateTo filter:', filters.dateTo);
        conditions.push(lte(dailyWorkLogs.date, filters.dateTo));
      }

      if (filters?.teamId && filters.teamId !== 'all') {
        console.log('Storage: Adding team filter:', filters.teamId);
        conditions.push(eq(dailyWorkLogs.teamId, filters.teamId));
      }

      if (filters?.workOrderId) {
        console.log('Storage: Adding work order filter:', filters.workOrderId);
        conditions.push(eq(dailyWorkLogs.workOrderId, filters.workOrderId));
      }

      if (filters?.status) {
        console.log('Storage: Adding status filter:', filters.status);
        conditions.push(eq(dailyWorkLogs.status, filters.status));
      }

      const allLogs = await db
        .select()
        .from(dailyWorkLogs)
        .where(and(...conditions))
        .orderBy(desc(dailyWorkLogs.createdAt));

      // Apply limit after fetching if specified
      const logs = filters?.limit ? allLogs.slice(0, filters.limit) : allLogs;
      
      console.log('Storage: Found daily work logs:', logs.length, logs.map(l => ({ id: l.id, date: l.date, teamId: l.teamId })));
      return logs;
    } catch (error) {
      console.error('Get daily work logs error:', error);
      return [];
    }
  }

  async createDailyWorkLog(insertLog: InsertDailyWorkLog): Promise<DailyWorkLog> {
    const [log] = await db
      .insert(dailyWorkLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async updateDailyWorkLog(id: string, updateData: Partial<InsertDailyWorkLog>, tenantId: string): Promise<DailyWorkLog | undefined> {
    try {
      const [updated] = await db
        .update(dailyWorkLogs)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(
          eq(dailyWorkLogs.id, id),
          eq(dailyWorkLogs.tenantId, tenantId)
        ))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Update daily work log error:', error);
      return undefined;
    }
  }

  async deleteDailyWorkLog(id: string, tenantId: string): Promise<boolean> {
    try {
      console.log('Storage: Deleting daily work log:', { id, tenantId });
      const [deleted] = await db
        .delete(dailyWorkLogs)
        .where(and(
          eq(dailyWorkLogs.id, id),
          eq(dailyWorkLogs.tenantId, tenantId)
        ))
        .returning();
      
      const success = !!deleted;
      console.log('Storage: Delete result:', success);
      return success;
    } catch (error) {
      console.error('Delete daily work log error:', error);
      return false;
    }
  }

  async getSubJobsByWorkOrder(workOrderId: string): Promise<SubJob[]> {
    try {
      const jobs = await db
        .select()
        .from(subJobs)
        .where(eq(subJobs.workOrderId, workOrderId))
        .orderBy(asc(subJobs.id));
      return jobs;
    } catch (error) {
      console.error('Get sub jobs by work order error:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
