import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupStandaloneAuth, requireStandaloneAuth } from "./standalone-auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup standalone authentication system - no database dependencies
  setupStandaloneAuth(app);

  // Dashboard route - returns minimal data
  app.get('/api/dashboard/metrics', requireStandaloneAuth, (req: any, res) => {
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

  // Basic protected routes that return empty arrays
  app.get('/api/customers', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/products', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/quotations', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/transactions', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/roles', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/permissions', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/users', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/colors', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/sizes', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/work-types', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/departments', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/teams', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/work-steps', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/employees', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/work-queues', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/production-capacities', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/holidays', requireStandaloneAuth, (req: any, res) => res.json([]));
  app.get('/api/work-orders', requireStandaloneAuth, (req: any, res) => res.json([]));

  // Stub POST routes for basic functionality
  app.post('/api/customers', requireStandaloneAuth, (req: any, res) => {
    res.status(201).json({ id: 1, ...req.body, createdAt: new Date() });
  });

  app.post('/api/products', requireStandaloneAuth, (req: any, res) => {
    res.status(201).json({ id: 1, ...req.body, createdAt: new Date() });
  });

  app.post('/api/quotations', requireStandaloneAuth, (req: any, res) => {
    res.status(201).json({ id: 1, ...req.body, createdAt: new Date() });
  });

  app.post('/api/transactions', requireStandaloneAuth, (req: any, res) => {
    res.status(201).json({ id: 1, ...req.body, createdAt: new Date() });
  });

  app.post('/api/work-orders', requireStandaloneAuth, (req: any, res) => {
    res.status(201).json({ id: 1, ...req.body, createdAt: new Date() });
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}