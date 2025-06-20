import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupMinimalAuth } from "./minimal-auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup minimal authentication system
  setupMinimalAuth(app);

  // Dashboard route - returns empty data for now
  app.get('/api/dashboard/metrics', (req: any, res) => {
    res.json({
      revenue: { current: 0, percentage: 0 },
      expenses: 0,
      profit: 0,
      pendingOrders: 0,
      activeUsers: 1,
      lowStockItems: 0,
      inventoryValue: 0
    });
  });

  // Basic routes that return empty arrays to prevent errors
  app.get('/api/customers', (req: any, res) => res.json([]));
  app.get('/api/products', (req: any, res) => res.json([]));
  app.get('/api/quotations', (req: any, res) => res.json([]));
  app.get('/api/transactions', (req: any, res) => res.json([]));
  app.get('/api/roles', (req: any, res) => res.json([]));
  app.get('/api/permissions', (req: any, res) => res.json([]));
  app.get('/api/users', (req: any, res) => res.json([]));
  app.get('/api/colors', (req: any, res) => res.json([]));
  app.get('/api/sizes', (req: any, res) => res.json([]));
  app.get('/api/work-types', (req: any, res) => res.json([]));
  app.get('/api/departments', (req: any, res) => res.json([]));
  app.get('/api/teams', (req: any, res) => res.json([]));
  app.get('/api/work-steps', (req: any, res) => res.json([]));
  app.get('/api/employees', (req: any, res) => res.json([]));
  app.get('/api/work-queues', (req: any, res) => res.json([]));
  app.get('/api/production-capacities', (req: any, res) => res.json([]));
  app.get('/api/holidays', (req: any, res) => res.json([]));
  app.get('/api/work-orders', (req: any, res) => res.json([]));
  app.get('/api/production-plans', (req: any, res) => res.json([]));
  app.get('/api/daily-work-logs', (req: any, res) => res.json([]));

  const httpServer = createServer(app);
  return httpServer;
}