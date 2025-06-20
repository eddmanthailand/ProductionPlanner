import type { IStorage } from "./storage";
import type { User, InsertUser } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";

import memorystore from 'memorystore';
const MemoryStore = memorystore(session);

export class SimpleMemoryStorage implements Partial<IStorage> {
  sessionStore: any;
  private users: Map<number, User> = new Map();
  private nextUserId = 2;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
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
        updatedAt: new Date(),
        lastLoginAt: null,
        deletedAt: null
      };
      this.users.set(1, adminUser);

      console.log('Simple memory storage initialized with admin user');
    } catch (error) {
      console.error('Error initializing simple memory storage:', error);
    }
  }

  // Essential user operations for login
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
      updatedAt: new Date(),
      lastLoginAt: null,
      deletedAt: null
    };
    this.users.set(user.id, user);
    return user;
  }

  // Stub methods for compatibility - return empty arrays/defaults
  async getRoles(): Promise<any[]> { return []; }
  async getPermissions(): Promise<any[]> { return []; }
  async getTenants(): Promise<any[]> { return []; }
  async getProducts(): Promise<any[]> { return []; }
  async getCustomers(): Promise<any[]> { return []; }
  async getTransactions(): Promise<any[]> { return []; }
  async getColors(): Promise<any[]> { return []; }
  async getSizes(): Promise<any[]> { return []; }
  async getWorkTypes(): Promise<any[]> { return []; }
  async getDepartments(): Promise<any[]> { return []; }
  async getTeams(): Promise<any[]> { return []; }
  async getWorkSteps(): Promise<any[]> { return []; }
  async getEmployees(): Promise<any[]> { return []; }
  async getWorkQueues(): Promise<any[]> { return []; }
  async getProductionCapacities(): Promise<any[]> { return []; }
  async getHolidays(): Promise<any[]> { return []; }
  async getWorkOrders(): Promise<any[]> { return []; }
}