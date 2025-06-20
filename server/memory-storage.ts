import type { IStorage } from "./storage";
import type { User, InsertUser, UserWithRole, Role, InsertRole, Permission, InsertPermission, Tenant, InsertTenant, Product, InsertProduct, Transaction, InsertTransaction, Customer, InsertCustomer, Color, InsertColor, Size, InsertSize, WorkType, InsertWorkType, Department, InsertDepartment, Team, InsertTeam, WorkStep, InsertWorkStep, Employee, InsertEmployee, WorkQueue, InsertWorkQueue, ProductionCapacity, InsertProductionCapacity, Holiday, InsertHoliday, WorkOrder, InsertWorkOrder, RolePermission, InsertRolePermission } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";

const memorystore = require('memorystore');
const MemoryStore = memorystore(session);

export class MemoryStorage implements IStorage {
  sessionStore: session.SessionStore;
  private users: Map<number, User> = new Map();
  private roles: Map<number, Role> = new Map();
  private permissions: Map<number, Permission> = new Map();
  private rolePermissions: Map<string, RolePermission> = new Map();
  private tenants: Map<string, Tenant> = new Map();
  private nextUserId = 2;
  private nextRoleId = 9;
  private nextPermissionId = 1;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Default tenant
      const defaultTenant: Tenant = {
        id: 'default',
        name: 'Default Company',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.tenants.set('default', defaultTenant);

      // Default admin user
      const adminUser: User = {
        id: 1,
        username: 'admin',
        password: hashedPassword,
        email: 'admin@company.com',
        firstName: 'Admin',
        lastName: 'User',
        roleId: 1,
        isActive: true,
        tenantId: 'default',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.users.set(1, adminUser);

      // Default roles
      const roles = [
        { id: 1, name: 'Super Admin', level: 1, description: 'ผู้ดูแลระบบสูงสุด' },
        { id: 2, name: 'Admin', level: 2, description: 'ผู้ดูแลระบบ' },
        { id: 3, name: 'Manager', level: 3, description: 'ผู้จัดการ' },
        { id: 4, name: 'Supervisor', level: 4, description: 'หัวหน้างาน' },
        { id: 5, name: 'Lead', level: 5, description: 'หัวหน้าทีม' },
        { id: 6, name: 'Senior', level: 6, description: 'พนักงานอาวุโส' },
        { id: 7, name: 'Employee', level: 7, description: 'พนักงาน' },
        { id: 8, name: 'Trainee', level: 8, description: 'พนักงานฝึกหัด' }
      ];

      roles.forEach(role => {
        this.roles.set(role.id, {
          ...role,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });

      console.log('Memory storage initialized with default data');
    } catch (error) {
      console.error('Error initializing memory storage:', error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.nextUserId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updateData: UpdateUser, tenantId: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user && user.tenantId === tenantId) {
      const updatedUser = { ...user, ...updateData, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async deleteUser(id: number, tenantId: string): Promise<boolean> {
    const user = this.users.get(id);
    if (user && user.tenantId === tenantId) {
      const updatedUser = { ...user, isActive: false, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      return true;
    }
    return false;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.tenantId === tenantId);
  }

  async getUsersWithRoles(tenantId: string): Promise<UserWithRole[]> {
    const users = Array.from(this.users.values()).filter(user => user.tenantId === tenantId);
    return users.map(user => ({
      ...user,
      role: this.roles.get(user.roleId) || null
    }));
  }

  // Role operations
  async getRoles(): Promise<Role[]> {
    return Array.from(this.roles.values());
  }

  async getRole(id: number): Promise<Role | undefined> {
    return this.roles.get(id);
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const role: Role = {
      ...insertRole,
      id: this.nextRoleId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.roles.set(role.id, role);
    return role;
  }

  async updateRole(id: number, updateData: UpdateRole): Promise<Role | undefined> {
    const role = this.roles.get(id);
    if (role) {
      const updatedRole = { ...role, ...updateData, updatedAt: new Date() };
      this.roles.set(id, updatedRole);
      return updatedRole;
    }
    return undefined;
  }

  async deleteRole(id: number): Promise<boolean> {
    return this.roles.delete(id);
  }

  // Permission operations
  async getPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async getPermission(id: number): Promise<Permission | undefined> {
    return this.permissions.get(id);
  }

  async createPermission(insertPermission: InsertPermission): Promise<Permission> {
    const permission: Permission = {
      ...insertPermission,
      id: this.nextPermissionId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.permissions.set(permission.id, permission);
    return permission;
  }

  async updatePermission(id: number, updateData: UpdatePermission): Promise<Permission | undefined> {
    const permission = this.permissions.get(id);
    if (permission) {
      const updatedPermission = { ...permission, ...updateData, updatedAt: new Date() };
      this.permissions.set(id, updatedPermission);
      return updatedPermission;
    }
    return undefined;
  }

  async deletePermission(id: number): Promise<boolean> {
    return this.permissions.delete(id);
  }

  // Role-Permission operations
  async getRolePermissions(roleId: number): Promise<RolePermission[]> {
    return Array.from(this.rolePermissions.values()).filter(rp => rp.roleId === roleId);
  }

  async createRolePermission(insertRolePermission: InsertRolePermission): Promise<RolePermission> {
    const key = `${insertRolePermission.roleId}-${insertRolePermission.permissionId}`;
    const rolePermission: RolePermission = {
      ...insertRolePermission,
      createdAt: new Date()
    };
    this.rolePermissions.set(key, rolePermission);
    return rolePermission;
  }

  async deleteRolePermission(roleId: number, permissionId: number): Promise<boolean> {
    const key = `${roleId}-${permissionId}`;
    return this.rolePermissions.delete(key);
  }

  // Replit Auth operations (stubs)
  async upsertUser(userData: any): Promise<User> {
    throw new Error("Not implemented in memory storage");
  }

  // Other operations (stubs - implement as needed)
  async getTenants(): Promise<Tenant[]> { return Array.from(this.tenants.values()); }
  async getTenant(id: string): Promise<Tenant | undefined> { return this.tenants.get(id); }
  async createTenant(insertTenant: InsertTenant): Promise<Tenant> { throw new Error("Not implemented"); }
  async updateTenant(id: string, updateData: UpdateTenant): Promise<Tenant | undefined> { throw new Error("Not implemented"); }
  async deleteTenant(id: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getProducts(tenantId: string): Promise<Product[]> { return []; }
  async getProduct(id: number, tenantId: string): Promise<Product | undefined> { return undefined; }
  async createProduct(insertProduct: InsertProduct): Promise<Product> { throw new Error("Not implemented"); }
  async updateProduct(id: number, updateData: UpdateProduct, tenantId: string): Promise<Product | undefined> { throw new Error("Not implemented"); }
  async deleteProduct(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getTransactions(tenantId: string): Promise<Transaction[]> { return []; }
  async getTransaction(id: number, tenantId: string): Promise<Transaction | undefined> { return undefined; }
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> { throw new Error("Not implemented"); }
  async updateTransaction(id: number, updateData: UpdateTransaction, tenantId: string): Promise<Transaction | undefined> { throw new Error("Not implemented"); }
  async deleteTransaction(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getCustomers(tenantId: string): Promise<Customer[]> { return []; }
  async getCustomer(id: number, tenantId: string): Promise<Customer | undefined> { return undefined; }
  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> { throw new Error("Not implemented"); }
  async updateCustomer(id: number, updateData: UpdateCustomer, tenantId: string): Promise<Customer | undefined> { throw new Error("Not implemented"); }
  async deleteCustomer(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getColors(tenantId: string): Promise<Color[]> { return []; }
  async getColor(id: number, tenantId: string): Promise<Color | undefined> { return undefined; }
  async createColor(insertColor: InsertColor): Promise<Color> { throw new Error("Not implemented"); }
  async updateColor(id: number, updateData: UpdateColor, tenantId: string): Promise<Color | undefined> { throw new Error("Not implemented"); }
  async deleteColor(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getSizes(tenantId: string): Promise<Size[]> { return []; }
  async getSize(id: number, tenantId: string): Promise<Size | undefined> { return undefined; }
  async createSize(insertSize: InsertSize): Promise<Size> { throw new Error("Not implemented"); }
  async updateSize(id: number, updateData: UpdateSize, tenantId: string): Promise<Size | undefined> { throw new Error("Not implemented"); }
  async deleteSize(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getWorkTypes(tenantId: string): Promise<WorkType[]> { return []; }
  async getWorkType(id: number, tenantId: string): Promise<WorkType | undefined> { return undefined; }
  async createWorkType(insertWorkType: InsertWorkType): Promise<WorkType> { throw new Error("Not implemented"); }
  async updateWorkType(id: number, updateData: UpdateWorkType, tenantId: string): Promise<WorkType | undefined> { throw new Error("Not implemented"); }
  async deleteWorkType(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getDepartments(tenantId: string): Promise<Department[]> { return []; }
  async getDepartment(id: number, tenantId: string): Promise<Department | undefined> { return undefined; }
  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> { throw new Error("Not implemented"); }
  async updateDepartment(id: number, updateData: UpdateDepartment, tenantId: string): Promise<Department | undefined> { throw new Error("Not implemented"); }
  async deleteDepartment(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getTeams(tenantId: string): Promise<Team[]> { return []; }
  async getTeam(id: number, tenantId: string): Promise<Team | undefined> { return undefined; }
  async createTeam(insertTeam: InsertTeam): Promise<Team> { throw new Error("Not implemented"); }
  async updateTeam(id: number, updateData: UpdateTeam, tenantId: string): Promise<Team | undefined> { throw new Error("Not implemented"); }
  async deleteTeam(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getWorkSteps(tenantId: string): Promise<WorkStep[]> { return []; }
  async getWorkStep(id: number, tenantId: string): Promise<WorkStep | undefined> { return undefined; }
  async createWorkStep(insertWorkStep: InsertWorkStep): Promise<WorkStep> { throw new Error("Not implemented"); }
  async updateWorkStep(id: number, updateData: UpdateWorkStep, tenantId: string): Promise<WorkStep | undefined> { throw new Error("Not implemented"); }
  async deleteWorkStep(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getEmployees(tenantId: string): Promise<Employee[]> { return []; }
  async getEmployee(id: number, tenantId: string): Promise<Employee | undefined> { return undefined; }
  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> { throw new Error("Not implemented"); }
  async updateEmployee(id: number, updateData: UpdateEmployee, tenantId: string): Promise<Employee | undefined> { throw new Error("Not implemented"); }
  async deleteEmployee(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getWorkQueues(tenantId: string): Promise<WorkQueue[]> { return []; }
  async getWorkQueue(id: number, tenantId: string): Promise<WorkQueue | undefined> { return undefined; }
  async createWorkQueue(insertWorkQueue: InsertWorkQueue): Promise<WorkQueue> { throw new Error("Not implemented"); }
  async updateWorkQueue(id: number, updateData: UpdateWorkQueue, tenantId: string): Promise<WorkQueue | undefined> { throw new Error("Not implemented"); }
  async deleteWorkQueue(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getProductionCapacities(tenantId: string): Promise<ProductionCapacity[]> { return []; }
  async getProductionCapacity(id: number, tenantId: string): Promise<ProductionCapacity | undefined> { return undefined; }
  async createProductionCapacity(insertProductionCapacity: InsertProductionCapacity): Promise<ProductionCapacity> { throw new Error("Not implemented"); }
  async updateProductionCapacity(id: number, updateData: UpdateProductionCapacity, tenantId: string): Promise<ProductionCapacity | undefined> { throw new Error("Not implemented"); }
  async deleteProductionCapacity(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getHolidays(tenantId: string): Promise<Holiday[]> { return []; }
  async getHoliday(id: number, tenantId: string): Promise<Holiday | undefined> { return undefined; }
  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> { throw new Error("Not implemented"); }
  async updateHoliday(id: number, updateData: UpdateHoliday, tenantId: string): Promise<Holiday | undefined> { throw new Error("Not implemented"); }
  async deleteHoliday(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  async getWorkOrders(tenantId: string): Promise<WorkOrder[]> { return []; }
  async getWorkOrder(id: number, tenantId: string): Promise<WorkOrder | undefined> { return undefined; }
  async createWorkOrder(insertWorkOrder: InsertWorkOrder): Promise<WorkOrder> { throw new Error("Not implemented"); }
  async updateWorkOrder(id: number, updateData: UpdateWorkOrder, tenantId: string): Promise<WorkOrder | undefined> { throw new Error("Not implemented"); }
  async deleteWorkOrder(id: number, tenantId: string): Promise<boolean> { throw new Error("Not implemented"); }

  // Add missing methods that routes.ts is calling
  async getUserPermissions(userId: number): Promise<Permission[]> {
    const user = this.users.get(userId);
    if (!user || !user.roleId) return [];
    
    // For admin user (roleId 1), return all permissions
    if (user.roleId === 1) {
      return Array.from(this.permissions.values());
    }
    
    // For other users, return empty for now
    return [];
  }

  private pageAccessData: Map<string, any> = new Map();
  private nextPageAccessId = 1;

  async getPageAccessByRole(roleId: number): Promise<any[]> {
    // Get all page access entries for this role
    const entries = Array.from(this.pageAccessData.values()).filter(
      entry => entry.roleId === roleId
    );
    
    return entries;
  }

  async upsertPageAccess(data: {
    roleId: number;
    pageName: string;
    pageUrl: string;
    accessLevel: string;
  }): Promise<any> {
    const key = `${data.roleId}-${data.pageUrl}`;
    const existing = this.pageAccessData.get(key);
    
    if (existing) {
      // Update existing
      const updated = {
        ...existing,
        accessLevel: data.accessLevel,
        updatedAt: new Date()
      };
      this.pageAccessData.set(key, updated);
      return updated;
    } else {
      // Create new
      const newEntry = {
        id: this.nextPageAccessId++,
        roleId: data.roleId,
        pageName: data.pageName,
        pageUrl: data.pageUrl,
        accessLevel: data.accessLevel,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.pageAccessData.set(key, newEntry);
      return newEntry;
    }
  }
}