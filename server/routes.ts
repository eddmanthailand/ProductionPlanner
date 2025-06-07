import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTenantSchema, insertProductSchema, insertProductionOrderSchema, insertTransactionSchema, insertCustomerSchema, insertColorSchema, insertSizeSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify JWT token and extract tenant
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;

      const token = jwt.sign(
        { 
          userId: user.id, 
          tenantId: user.tenantId,
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ 
        token, 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        tenant 
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Registration failed", error });
    }
  });

  // Tenant routes
  app.get("/api/tenants", authenticateToken, async (req: any, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/tenants", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(validatedData);
      res.status(201).json(tenant);
    } catch (error) {
      res.status(400).json({ message: "Failed to create tenant", error });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/metrics", authenticateToken, async (req: any, res) => {
    try {
      const metrics = await storage.getDashboardMetrics(req.user.tenantId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Products routes
  app.get("/api/products", authenticateToken, async (req: any, res) => {
    try {
      const products = await storage.getProducts(req.user.tenantId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertProductSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      const product = await storage.createProduct(validatedData);
      
      // Log activity
      await storage.createActivity({
        type: "product_created",
        description: `Product "${product.name}" was created`,
        userId: req.user.userId,
        tenantId: req.user.tenantId
      });

      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Failed to create product", error });
    }
  });

  app.put("/api/products/:id", authenticateToken, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      
      const product = await storage.updateProduct(productId, validatedData, req.user.tenantId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Failed to update product", error });
    }
  });

  // Production Orders routes
  app.get("/api/production-orders", authenticateToken, async (req: any, res) => {
    try {
      const orders = await storage.getProductionOrders(req.user.tenantId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch production orders" });
    }
  });

  app.post("/api/production-orders", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertProductionOrderSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
        orderNumber: `PO-${Date.now()}`
      });
      
      const order = await storage.createProductionOrder(validatedData);
      
      // Log activity
      await storage.createActivity({
        type: "production_order_created",
        description: `Production order ${order.orderNumber} was created`,
        userId: req.user.userId,
        tenantId: req.user.tenantId
      });

      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to create production order", error });
    }
  });

  app.put("/api/production-orders/:id", authenticateToken, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const validatedData = insertProductionOrderSchema.partial().parse(req.body);
      
      const order = await storage.updateProductionOrder(orderId, validatedData, req.user.tenantId);
      if (!order) {
        return res.status(404).json({ message: "Production order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to update production order", error });
    }
  });

  // Inventory routes
  app.get("/api/inventory", authenticateToken, async (req: any, res) => {
    try {
      const inventory = await storage.getInventory(req.user.tenantId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Transactions routes
  app.get("/api/transactions", authenticateToken, async (req: any, res) => {
    try {
      const transactions = await storage.getTransactions(req.user.tenantId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const transaction = await storage.createTransaction(validatedData);
      
      // Log activity
      await storage.createActivity({
        type: "transaction_created",
        description: `${transaction.type} transaction of ${transaction.amount} was recorded`,
        userId: req.user.userId,
        tenantId: req.user.tenantId
      });

      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Failed to create transaction", error });
    }
  });

  // Activities routes
  app.get("/api/activities", authenticateToken, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getActivities(req.user.tenantId, limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Users routes
  app.get("/api/users", authenticateToken, async (req: any, res) => {
    try {
      const users = await storage.getUsersByTenant(req.user.tenantId);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Customers routes
  app.get("/api/customers", authenticateToken, async (req: any, res) => {
    try {
      const customers = await storage.getCustomers(req.user.tenantId);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertCustomerSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: "Failed to create customer", error });
    }
  });

  app.put("/api/customers/:id", authenticateToken, async (req: any, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      
      const customer = await storage.updateCustomer(customerId, validatedData, req.user.tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: "Failed to update customer", error });
    }
  });

  app.delete("/api/customers/:id", authenticateToken, async (req: any, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const deleted = await storage.deleteCustomer(customerId, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete customer", error });
    }
  });

  // Colors routes
  app.get("/api/colors", authenticateToken, async (req: any, res) => {
    try {
      const colors = await storage.getColors(req.user.tenantId);
      res.json(colors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch colors" });
    }
  });

  app.post("/api/colors", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertColorSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      const color = await storage.createColor(validatedData);
      res.status(201).json(color);
    } catch (error) {
      res.status(400).json({ message: "Failed to create color", error });
    }
  });

  app.put("/api/colors/:id", authenticateToken, async (req: any, res) => {
    try {
      const colorId = parseInt(req.params.id);
      const validatedData = insertColorSchema.partial().parse(req.body);
      
      const color = await storage.updateColor(colorId, validatedData, req.user.tenantId);
      if (!color) {
        return res.status(404).json({ message: "Color not found" });
      }

      res.json(color);
    } catch (error) {
      res.status(400).json({ message: "Failed to update color", error });
    }
  });

  app.delete("/api/colors/:id", authenticateToken, async (req: any, res) => {
    try {
      const colorId = parseInt(req.params.id);
      const deleted = await storage.deleteColor(colorId, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Color not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete color", error });
    }
  });

  // Sizes routes
  app.get("/api/sizes", authenticateToken, async (req: any, res) => {
    try {
      const sizes = await storage.getSizes(req.user.tenantId);
      res.json(sizes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sizes" });
    }
  });

  app.post("/api/sizes", authenticateToken, async (req: any, res) => {
    try {
      const validatedData = insertSizeSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      const size = await storage.createSize(validatedData);
      res.status(201).json(size);
    } catch (error) {
      res.status(400).json({ message: "Failed to create size", error });
    }
  });

  app.put("/api/sizes/:id", authenticateToken, async (req: any, res) => {
    try {
      const sizeId = parseInt(req.params.id);
      const validatedData = insertSizeSchema.partial().parse(req.body);
      
      const size = await storage.updateSize(sizeId, validatedData, req.user.tenantId);
      if (!size) {
        return res.status(404).json({ message: "Size not found" });
      }

      res.json(size);
    } catch (error) {
      res.status(400).json({ message: "Failed to update size", error });
    }
  });

  app.delete("/api/sizes/:id", authenticateToken, async (req: any, res) => {
    try {
      const sizeId = parseInt(req.params.id);
      const deleted = await storage.deleteSize(sizeId, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Size not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete size", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
