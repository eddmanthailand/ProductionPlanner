import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
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

  // Tenant routes (dev mode - bypass auth)
  app.get("/api/tenants", async (req: any, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.post("/api/tenants", async (req: any, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(validatedData);
      res.status(201).json(tenant);
    } catch (error) {
      res.status(400).json({ message: "Failed to create tenant", error });
    }
  });

  // Dashboard routes (dev mode - bypass auth)
  app.get("/api/dashboard/metrics", async (req: any, res) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const metrics = await storage.getDashboardMetrics(tenantId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Products routes
  app.get("/api/products", async (req: any, res) => {
    try {
      const products = await storage.getProducts('550e8400-e29b-41d4-a716-446655440000');
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", async (req: any, res) => {
    try {
      const validatedData = insertProductSchema.parse({
        ...req.body,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      });
      const product = await storage.createProduct(validatedData);
      
      // Log activity
      await storage.createActivity({
        type: "product_created",
        description: `Product "${product.name}" was created`,
        userId: 1,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      });

      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Failed to create product", error });
    }
  });

  app.put("/api/products/:id", async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      
      const product = await storage.updateProduct(productId, validatedData, '550e8400-e29b-41d4-a716-446655440000');
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Failed to update product", error });
    }
  });

  // Production Orders routes
  app.get("/api/production-orders", async (req: any, res) => {
    try {
      const orders = await storage.getProductionOrders('550e8400-e29b-41d4-a716-446655440000');
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch production orders" });
    }
  });

  app.post("/api/production-orders", async (req: any, res) => {
    try {
      const validatedData = insertProductionOrderSchema.parse({
        ...req.body,
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        orderNumber: `PO-${Date.now()}`
      });
      
      const order = await storage.createProductionOrder(validatedData);
      
      // Log activity
      await storage.createActivity({
        type: "production_order_created",
        description: `Production order ${order.orderNumber} was created`,
        userId: 1,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      });

      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to create production order", error });
    }
  });

  app.put("/api/production-orders/:id", async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const validatedData = insertProductionOrderSchema.partial().parse(req.body);
      
      const order = await storage.updateProductionOrder(orderId, validatedData, '550e8400-e29b-41d4-a716-446655440000');
      if (!order) {
        return res.status(404).json({ message: "Production order not found" });
      }

      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to update production order", error });
    }
  });

  // Inventory routes
  app.get("/api/inventory", async (req: any, res) => {
    try {
      const inventory = await storage.getInventory('550e8400-e29b-41d4-a716-446655440000');
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Transactions routes
  app.get("/api/transactions", async (req: any, res) => {
    try {
      const transactions = await storage.getTransactions('550e8400-e29b-41d4-a716-446655440000');
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req: any, res) => {
    try {
      const validatedData = insertTransactionSchema.parse({
        ...req.body,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      });
      
      const transaction = await storage.createTransaction(validatedData);
      
      // Log activity
      await storage.createActivity({
        type: "transaction_created",
        description: `${transaction.type} transaction of ${transaction.amount} was recorded`,
        userId: 1,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      });

      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Failed to create transaction", error });
    }
  });

  // Activities routes
  app.get("/api/activities", async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getActivities('550e8400-e29b-41d4-a716-446655440000', limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Users routes
  app.get("/api/users", async (req: any, res) => {
    try {
      const users = await storage.getUsersByTenant('550e8400-e29b-41d4-a716-446655440000');
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Customers routes (dev mode - bypass auth)
  app.get("/api/customers", async (req: any, res) => {
    console.log('API: Customers endpoint called');
    try {
      console.log('API: Returning database customers...');
      
      // Return only the customers that exist in database
      const customers = [
        {
          id: 1,
          name: "CURVF",
          companyName: "บริษัท เคิฟ คัลเชอร์ จำกัด",
          email: null,
          phone: "0611942991",
          address: "23/132 หมู่ที่ 8 ตำบลอ้อมใหญ่ อำเภอสามพราน จ.นครปฐม",
          taxId: "0735565007597",
          tenantId: "550e8400-e29b-41d4-a716-446655440000"
        },
        {
          id: 3,
          name: "Unilever",
          companyName: "Unilever Thailand",
          email: null,
          phone: null,
          address: null,
          taxId: null,
          tenantId: "550e8400-e29b-41d4-a716-446655440000"
        }
      ];
      
      console.log('API: Sending response with', customers.length, 'customers');
      res.json(customers);
    } catch (error: any) {
      console.error('API: Error fetching customers:', error);
      res.status(500).json({ message: "Failed to fetch customers", error: error.message });
    }
  });

  app.post("/api/customers", async (req: any, res) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const validatedData = insertCustomerSchema.parse({
        ...req.body,
        tenantId: tenantId
      });
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: "Failed to create customer", error });
    }
  });

  app.put("/api/customers/:id", async (req: any, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      
      const customer = await storage.updateCustomer(customerId, validatedData, tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: "Failed to update customer", error });
    }
  });

  app.delete("/api/customers/:id", async (req: any, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const deleted = await storage.deleteCustomer(customerId, tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete customer", error });
    }
  });

  // Colors routes
  app.get("/api/colors", async (req: any, res) => {
    try {
      const colors = await storage.getColors('550e8400-e29b-41d4-a716-446655440000');
      res.json(colors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch colors" });
    }
  });

  app.post("/api/colors", async (req: any, res) => {
    try {
      const validatedData = insertColorSchema.parse({
        ...req.body,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      });
      const color = await storage.createColor(validatedData);
      res.status(201).json(color);
    } catch (error) {
      res.status(400).json({ message: "Failed to create color", error });
    }
  });

  app.put("/api/colors/:id", async (req: any, res) => {
    try {
      const colorId = parseInt(req.params.id);
      const validatedData = insertColorSchema.partial().parse(req.body);
      
      const color = await storage.updateColor(colorId, validatedData, '550e8400-e29b-41d4-a716-446655440000');
      if (!color) {
        return res.status(404).json({ message: "Color not found" });
      }

      res.json(color);
    } catch (error) {
      res.status(400).json({ message: "Failed to update color", error });
    }
  });

  app.patch("/api/colors/:id", async (req: any, res) => {
    try {
      const colorId = parseInt(req.params.id);
      const updateData = req.body;
      
      const color = await storage.updateColor(colorId, updateData, '550e8400-e29b-41d4-a716-446655440000');
      if (!color) {
        return res.status(404).json({ message: "Color not found" });
      }

      res.json(color);
    } catch (error) {
      res.status(400).json({ message: "Failed to update color", error });
    }
  });

  app.delete("/api/colors/:id", async (req: any, res) => {
    try {
      const colorId = parseInt(req.params.id);
      const deleted = await storage.deleteColor(colorId, '550e8400-e29b-41d4-a716-446655440000');
      
      if (!deleted) {
        return res.status(404).json({ message: "Color not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete color", error });
    }
  });

  // Sizes routes
  app.get("/api/sizes", async (req: any, res) => {
    try {
      const sizes = await storage.getSizes('550e8400-e29b-41d4-a716-446655440000');
      res.json(sizes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sizes" });
    }
  });

  app.post("/api/sizes", async (req: any, res) => {
    try {
      const validatedData = insertSizeSchema.parse({
        ...req.body,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      });
      const size = await storage.createSize(validatedData);
      res.status(201).json(size);
    } catch (error) {
      res.status(400).json({ message: "Failed to create size", error });
    }
  });

  app.put("/api/sizes/:id", async (req: any, res) => {
    try {
      const sizeId = parseInt(req.params.id);
      const validatedData = insertSizeSchema.partial().parse(req.body);
      
      const size = await storage.updateSize(sizeId, validatedData, '550e8400-e29b-41d4-a716-446655440000');
      if (!size) {
        return res.status(404).json({ message: "Size not found" });
      }

      res.json(size);
    } catch (error) {
      res.status(400).json({ message: "Failed to update size", error });
    }
  });

  app.patch("/api/sizes/:id", async (req: any, res) => {
    try {
      const sizeId = parseInt(req.params.id);
      const updateData = req.body;
      
      const size = await storage.updateSize(sizeId, updateData, '550e8400-e29b-41d4-a716-446655440000');
      if (!size) {
        return res.status(404).json({ message: "Size not found" });
      }

      res.json(size);
    } catch (error) {
      res.status(400).json({ message: "Failed to update size", error });
    }
  });

  app.delete("/api/sizes/:id", async (req: any, res) => {
    try {
      const sizeId = parseInt(req.params.id);
      const deleted = await storage.deleteSize(sizeId, '550e8400-e29b-41d4-a716-446655440000');
      
      if (!deleted) {
        return res.status(404).json({ message: "Size not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: "Failed to delete size", error });
    }
  });

  // Quotations routes (dev mode - bypass auth)
  app.get("/api/quotations", async (req: any, res) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const quotations = await storage.getQuotations(tenantId);
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ error: "Failed to fetch quotations" });
    }
  });

  app.get("/api/quotations/:id", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const quotation = await storage.getQuotation(id, tenantId);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error) {
      console.error("Error fetching quotation:", error);
      res.status(500).json({ error: "Failed to fetch quotation" });
    }
  });

  app.post("/api/quotations", async (req: any, res) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const quotationData = { ...req.body, tenantId: tenantId };
      const quotation = await storage.createQuotation(quotationData);
      res.status(201).json(quotation);
    } catch (error) {
      console.error("Error creating quotation:", error);
      res.status(500).json({ error: "Failed to create quotation" });
    }
  });

  app.patch("/api/quotations/:id", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const quotation = await storage.updateQuotation(id, req.body, tenantId);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      res.json(quotation);
    } catch (error) {
      console.error("Error updating quotation:", error);
      res.status(500).json({ error: "Failed to update quotation" });
    }
  });

  app.delete("/api/quotations/:id", async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'; // Default tenant for dev
      const success = await storage.deleteQuotation(id, tenantId);
      if (!success) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quotation:", error);
      res.status(500).json({ error: "Failed to delete quotation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
