import { departments, teams, workSteps, employees, type Department, type Team, type WorkStep, type Employee } from "@shared/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";

export interface IStorage {
  // Department operations
  getDepartments(tenantId: string): Promise<Department[]>;
  
  // Team operations  
  getTeams(tenantId: string): Promise<Team[]>;
  
  // Work Steps operations
  getWorkSteps(tenantId: string): Promise<WorkStep[]>;
  
  // Employee operations
  getEmployees(tenantId: string): Promise<Employee[]>;
}

export class DatabaseStorage implements IStorage {
  
  // Department methods
  async getDepartments(tenantId: string): Promise<Department[]> {
    return await db
      .select()
      .from(departments)
      .where(eq(departments.tenantId, tenantId));
  }

  // Team methods
  async getTeams(tenantId: string): Promise<any[]> {
    const rows = await db
      .select()
      .from(teams)
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(eq(departments.tenantId, tenantId));
    
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

  // Work Steps methods
  async getWorkSteps(tenantId: string): Promise<WorkStep[]> {
    return await db
      .select()
      .from(workSteps)
      .where(eq(workSteps.tenantId, tenantId))
      .orderBy(asc(workSteps.orderNumber));
  }

  // Employee methods
  async getEmployees(tenantId: string): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
      .orderBy(employees.createdAt);
  }
}

export const storage = new DatabaseStorage();