import { 
  users, departments, teams, workSteps, employees, tenants,
  type User, type Department, type Team, type WorkStep, type Employee, type Tenant
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUserByUsername(username: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  createUser(userData: any): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
  // Tenant operations
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenantData: any): Promise<Tenant>;
  
  // Department operations
  getDepartments(tenantId: string): Promise<Department[]>;
  createDepartment(data: any): Promise<Department>;
  updateDepartment(id: string, data: any, tenantId: string): Promise<Department | undefined>;
  deleteDepartment(id: string, tenantId: string): Promise<boolean>;
  
  // Team operations  
  getTeams(tenantId: string): Promise<any[]>;
  getTeamsByDepartment(departmentId: string, tenantId: string): Promise<any[]>;
  createTeam(data: any): Promise<any>;
  updateTeam(id: string, data: any, tenantId: string): Promise<any>;
  deleteTeam(id: string, tenantId: string): Promise<boolean>;
  
  // Work Steps operations
  getWorkSteps(tenantId: string): Promise<WorkStep[]>;
  getWorkStepsByDepartment(departmentId: string, tenantId: string): Promise<WorkStep[]>;
  createWorkStep(data: any): Promise<WorkStep>;
  updateWorkStep(id: string, data: any, tenantId: string): Promise<WorkStep | undefined>;
  deleteWorkStep(id: string, tenantId: string): Promise<boolean>;
  
  // Employee operations
  getEmployees(tenantId: string): Promise<Employee[]>;
  getEmployeesByTeam(teamId: string, tenantId: string): Promise<Employee[]>;
  createEmployee(data: any): Promise<Employee>;
  updateEmployee(id: number, data: any, tenantId: string): Promise<Employee | undefined>;
  deleteEmployee(id: number, tenantId: string): Promise<boolean>;

  // Other minimal operations for non-implemented features
  getDashboardMetrics(tenantId: string): Promise<any>;
  getProducts(tenantId: string): Promise<any[]>;
  createProduct(data: any): Promise<any>;
  updateProduct(id: number, data: any, tenantId: string): Promise<any>;
  deleteProduct(id: number, tenantId: string): Promise<boolean>;
  getStockMovements(tenantId: string): Promise<any[]>;
  createStockMovement(data: any): Promise<any>;
  getTransactions(tenantId: string): Promise<any[]>;
  createTransaction(data: any): Promise<any>;
  getActivities(tenantId: string): Promise<any[]>;
  createActivity(data: any): Promise<any>;
  getCustomers(tenantId: string): Promise<any[]>;
  createCustomer(data: any): Promise<any>;
  updateCustomer(id: number, data: any, tenantId: string): Promise<any>;
  deleteCustomer(id: number, tenantId: string): Promise<boolean>;
  getColors(tenantId: string): Promise<any[]>;
  createColor(data: any): Promise<any>;
  updateColor(id: string, data: any, tenantId: string): Promise<any>;
  deleteColor(id: string, tenantId: string): Promise<boolean>;
  getSizes(tenantId: string): Promise<any[]>;
  createSize(data: any): Promise<any>;
  updateSize(id: string, data: any, tenantId: string): Promise<any>;
  deleteSize(id: string, tenantId: string): Promise<boolean>;
  getQuotations(tenantId: string): Promise<any[]>;
  getQuotation(id: string, tenantId: string): Promise<any>;
  createQuotation(data: any): Promise<any>;
  updateQuotation(id: string, data: any, tenantId: string): Promise<any>;
  deleteQuotation(id: string, tenantId: string): Promise<boolean>;
  getWorkQueues(tenantId: string): Promise<any[]>;
  getWorkQueuesByTeam(teamId: string, tenantId: string): Promise<any[]>;
  createWorkQueue(data: any): Promise<any>;
  updateWorkQueue(id: string, data: any, tenantId: string): Promise<any>;
  deleteWorkQueue(id: string, tenantId: string): Promise<boolean>;
  getProductionCapacities(tenantId: string): Promise<any[]>;
  getProductionCapacityByTeam(teamId: string, tenantId: string): Promise<any>;
  createProductionCapacity(data: any): Promise<any>;
  getHolidays(tenantId: string): Promise<any[]>;
  createHoliday(data: any): Promise<any>;
  deleteHoliday(id: string, tenantId: string): Promise<boolean>;
  getWorkTypes(tenantId: string): Promise<any[]>;
  createWorkType(data: any): Promise<any>;
  updateWorkType(id: string, data: any, tenantId: string): Promise<any>;
  deleteWorkType(id: string, tenantId: string): Promise<boolean>;
  getProductionPlans(tenantId: string): Promise<any[]>;
  createProductionPlan(data: any): Promise<any>;
  createProductionPlanItem(data: any): Promise<any>;
  getProductionPlanItems(planId: string, tenantId: string): Promise<any[]>;
  deleteProductionPlan(id: string, tenantId: string): Promise<boolean>;
  getDailyWorkLogs(tenantId: string, date?: string): Promise<any[]>;
  createDailyWorkLog(data: any): Promise<any>;
  updateDailyWorkLog(id: string, data: any, tenantId: string): Promise<any>;
  deleteDailyWorkLog(id: string, tenantId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  
  // User methods - using actual database column names
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(userData: any): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword
      })
      .returning();
    return user;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  // Tenant methods
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async createTenant(tenantData: any): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values({
        ...tenantData,
        id: nanoid()
      })
      .returning();
    return tenant;
  }

  // Department methods - using actual columns: id, name, tenant_id, is_active, created_at, updated_at, type
  async getDepartments(tenantId: string): Promise<Department[]> {
    return await db
      .select({
        id: departments.id,
        name: departments.name,
        tenantId: departments.tenantId,
        isActive: departments.isActive,
        createdAt: departments.createdAt,
        updatedAt: departments.updatedAt,
        type: departments.type
      })
      .from(departments)
      .where(eq(departments.tenantId, tenantId));
  }

  async createDepartment(data: any): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values({
        ...data,
        id: nanoid()
      })
      .returning();
    return department;
  }

  async updateDepartment(id: string, data: any, tenantId: string): Promise<Department | undefined> {
    const [department] = await db
      .update(departments)
      .set(data)
      .where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)))
      .returning();
    return department || undefined;
  }

  async deleteDepartment(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(departments)
      .where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Team methods - using actual columns: id, name, department_id, tenant_id, is_active, created_at, updated_at, leader
  async getTeams(tenantId: string): Promise<any[]> {
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        departmentId: teams.departmentId,
        leader: teams.leader,
        isActive: teams.isActive,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        departmentName: departments.name
      })
      .from(teams)
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(eq(teams.tenantId, tenantId));
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      departmentId: row.departmentId,
      leader: row.leader,
      departmentName: row.departmentName,
      status: row.isActive ? 'active' : 'inactive',
      costPerDay: '0',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  async getTeamsByDepartment(departmentId: string, tenantId: string): Promise<any[]> {
    const rows = await db
      .select()
      .from(teams)
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(and(eq(teams.departmentId, departmentId), eq(departments.tenantId, tenantId)));
    
    return rows.map(row => ({
      id: row.teams.id,
      name: row.teams.name,
      departmentId: row.teams.departmentId,
      leader: row.teams.leader,
      departmentName: row.departments.name,
      status: 'active',
      costPerDay: '0',
      createdAt: row.teams.createdAt,
      updatedAt: row.teams.updatedAt
    }));
  }

  async createTeam(data: any): Promise<any> {
    const [team] = await db
      .insert(teams)
      .values({
        ...data,
        id: nanoid()
      })
      .returning();
    return team;
  }

  async updateTeam(id: string, data: any, tenantId: string): Promise<any> {
    // Use a subquery to check tenant access
    const [team] = await db
      .update(teams)
      .set(data)
      .where(and(
        eq(teams.id, id),
        sql`${teams.departmentId} IN (SELECT id FROM ${departments} WHERE tenant_id = ${tenantId})`
      ))
      .returning();
    return team || undefined;
  }

  async deleteTeam(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(teams)
      .where(and(
        eq(teams.id, id),
        sql`${teams.departmentId} IN (SELECT id FROM ${departments} WHERE tenant_id = ${tenantId})`
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Work Steps methods - using actual columns: id, name, description, tenant_id, order_number, is_active, created_at, updated_at, department_id
  async getWorkSteps(tenantId: string): Promise<WorkStep[]> {
    return await db
      .select()
      .from(workSteps)
      .where(eq(workSteps.tenantId, tenantId))
      .orderBy(asc(workSteps.orderNumber));
  }

  async getWorkStepsByDepartment(departmentId: string, tenantId: string): Promise<WorkStep[]> {
    return await db
      .select()
      .from(workSteps)
      .where(and(eq(workSteps.departmentId, departmentId), eq(workSteps.tenantId, tenantId)))
      .orderBy(asc(workSteps.orderNumber));
  }

  async createWorkStep(data: any): Promise<WorkStep> {
    const [workStep] = await db
      .insert(workSteps)
      .values({
        ...data,
        id: nanoid()
      })
      .returning();
    return workStep;
  }

  async updateWorkStep(id: string, data: any, tenantId: string): Promise<WorkStep | undefined> {
    const [workStep] = await db
      .update(workSteps)
      .set(data)
      .where(and(eq(workSteps.id, id), eq(workSteps.tenantId, tenantId)))
      .returning();
    return workStep || undefined;
  }

  async deleteWorkStep(id: string, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(workSteps)
      .where(and(eq(workSteps.id, id), eq(workSteps.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Employee methods - using actual columns: id, user_id, employee_code, position, department_id, team_id, hire_date, salary, tenant_id, is_active, created_at, updated_at
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

  async createEmployee(data: any): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(data)
      .returning();
    return employee;
  }

  async updateEmployee(id: number, data: any, tenantId: string): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .returning();
    return employee || undefined;
  }

  async deleteEmployee(id: number, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(employees)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Placeholder methods for other features - return empty arrays/null
  async getDashboardMetrics(tenantId: string): Promise<any> {
    return { totalProducts: 0, totalCustomers: 0, totalOrders: 0, revenue: 0 };
  }

  async getProducts(tenantId: string): Promise<any[]> { return []; }
  async createProduct(data: any): Promise<any> { return null; }
  async updateProduct(id: number, data: any, tenantId: string): Promise<any> { return null; }
  async deleteProduct(id: number, tenantId: string): Promise<boolean> { return false; }
  async getStockMovements(tenantId: string): Promise<any[]> { return []; }
  async createStockMovement(data: any): Promise<any> { return null; }
  async getTransactions(tenantId: string): Promise<any[]> { return []; }
  async createTransaction(data: any): Promise<any> { return null; }
  async getActivities(tenantId: string): Promise<any[]> { return []; }
  async createActivity(data: any): Promise<any> { return null; }
  async getCustomers(tenantId: string): Promise<any[]> { return []; }
  async createCustomer(data: any): Promise<any> { return null; }
  async updateCustomer(id: number, data: any, tenantId: string): Promise<any> { return null; }
  async deleteCustomer(id: number, tenantId: string): Promise<boolean> { return false; }
  async getColors(tenantId: string): Promise<any[]> { return []; }
  async createColor(data: any): Promise<any> { return null; }
  async updateColor(id: string, data: any, tenantId: string): Promise<any> { return null; }
  async deleteColor(id: string, tenantId: string): Promise<boolean> { return false; }
  async getSizes(tenantId: string): Promise<any[]> { return []; }
  async createSize(data: any): Promise<any> { return null; }
  async updateSize(id: string, data: any, tenantId: string): Promise<any> { return null; }
  async deleteSize(id: string, tenantId: string): Promise<boolean> { return false; }
  async getQuotations(tenantId: string): Promise<any[]> { return []; }
  async getQuotation(id: string, tenantId: string): Promise<any> { return null; }
  async createQuotation(data: any): Promise<any> { return null; }
  async updateQuotation(id: string, data: any, tenantId: string): Promise<any> { return null; }
  async deleteQuotation(id: string, tenantId: string): Promise<boolean> { return false; }
  async getWorkQueues(tenantId: string): Promise<any[]> { return []; }
  async getWorkQueuesByTeam(teamId: string, tenantId: string): Promise<any[]> { return []; }
  async createWorkQueue(data: any): Promise<any> { return null; }
  async updateWorkQueue(id: string, data: any, tenantId: string): Promise<any> { return null; }
  async deleteWorkQueue(id: string, tenantId: string): Promise<boolean> { return false; }
  async getProductionCapacities(tenantId: string): Promise<any[]> { return []; }
  async getProductionCapacityByTeam(teamId: string, tenantId: string): Promise<any> { return null; }
  async createProductionCapacity(data: any): Promise<any> { return null; }
  async getHolidays(tenantId: string): Promise<any[]> { return []; }
  async createHoliday(data: any): Promise<any> { return null; }
  async deleteHoliday(id: string, tenantId: string): Promise<boolean> { return false; }
  async getWorkTypes(tenantId: string): Promise<any[]> { return []; }
  async createWorkType(data: any): Promise<any> { return null; }
  async updateWorkType(id: string, data: any, tenantId: string): Promise<any> { return null; }
  async deleteWorkType(id: string, tenantId: string): Promise<boolean> { return false; }
  async getProductionPlans(tenantId: string): Promise<any[]> { return []; }
  async createProductionPlan(data: any): Promise<any> { return null; }
  async createProductionPlanItem(data: any): Promise<any> { return null; }
  async getProductionPlanItems(planId: string, tenantId: string): Promise<any[]> { return []; }
  async deleteProductionPlan(id: string, tenantId: string): Promise<boolean> { return false; }
  async getDailyWorkLogs(tenantId: string, date?: string): Promise<any[]> { return []; }
  async createDailyWorkLog(data: any): Promise<any> { return null; }
  async updateDailyWorkLog(id: string, data: any, tenantId: string): Promise<any> { return null; }
  async deleteDailyWorkLog(id: string, tenantId: string): Promise<boolean> { return false; }
}

export const storage = new DatabaseStorage();