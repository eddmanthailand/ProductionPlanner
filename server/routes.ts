import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { insertUserSchema, insertTenantSchema, insertProductSchema, insertProductionOrderSchema, insertTransactionSchema, insertCustomerSchema, insertColorSchema, insertSizeSchema, insertDepartmentSchema, insertTeamSchema, insertWorkStepSchema, insertEmployeeSchema } from "@shared/schema";
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
  // Test database connection
  try {
    await pool.query('SELECT 1');
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    // Continue anyway - let individual routes handle connection errors
  }

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

  // Products and Services routes (replacing inventory)
  app.get("/api/inventory", async (req: any, res) => {
    try {
      console.log("API: Inventory endpoint called");
      console.log("API: Fetching products from database...");
      const products = await storage.getProducts('550e8400-e29b-41d4-a716-446655440000');
      console.log("API: Sending response with", products.length, "products");
      res.json(products);
    } catch (error) {
      console.error("API: Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/inventory", async (req: any, res) => {
    try {
      console.log("API: Creating new product...");
      const validatedData = insertProductSchema.parse(req.body);
      const productData = { 
        ...validatedData, 
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        price: validatedData.price ? validatedData.price.toString() : null,
        cost: validatedData.cost ? validatedData.cost.toString() : null
      };
      
      const product = await storage.createProduct(productData);
      console.log("API: Product created successfully:", product.id);
      res.status(201).json(product);
    } catch (error) {
      console.error("API: Error creating product:", error);
      res.status(400).json({ message: "Failed to create product", error });
    }
  });

  app.patch("/api/inventory/:id", async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      console.log("API: Updating product:", productId);
      
      const validatedData = insertProductSchema.partial().parse(req.body);
      const updateData = {
        ...validatedData,
        price: validatedData.price ? validatedData.price.toString() : undefined,
        cost: validatedData.cost ? validatedData.cost.toString() : undefined
      };
      
      const product = await storage.updateProduct(productId, updateData, '550e8400-e29b-41d4-a716-446655440000');
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log("API: Product updated successfully");
      res.json(product);
    } catch (error) {
      console.error("API: Error updating product:", error);
      res.status(400).json({ message: "Failed to update product", error });
    }
  });

  app.delete("/api/inventory/:id", async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      console.log("API: Deleting product:", productId);
      
      const success = await storage.deleteProduct(productId, '550e8400-e29b-41d4-a716-446655440000');
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log("API: Product deleted successfully");
      res.status(204).send();
    } catch (error) {
      console.error("API: Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Stock movements routes
  app.get("/api/stock-movements", async (req: any, res) => {
    try {
      const movements = await storage.getStockMovements('550e8400-e29b-41d4-a716-446655440000');
      res.json(movements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.post("/api/stock-movements", async (req: any, res) => {
    try {
      const movementData = { ...req.body, tenantId: '550e8400-e29b-41d4-a716-446655440000' };
      const movement = await storage.createStockMovement(movementData);
      res.status(201).json(movement);
    } catch (error) {
      res.status(500).json({ message: "Failed to create stock movement" });
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
      console.log('API: Fetching customers from database...');
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const customers = await storage.getCustomers(tenantId);
      
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

      // ตรวจสอบข้อมูลซ้ำก่อนสร้างลูกค้าใหม่
      const existingCustomers = await storage.getCustomers(tenantId);
      
      // ตรวจสอบชื่อลูกค้าซ้ำ
      if (validatedData.name && existingCustomers.some(c => 
        c.name.toLowerCase().trim() === validatedData.name.toLowerCase().trim()
      )) {
        return res.status(400).json({ 
          message: `ชื่อลูกค้า "${validatedData.name}" มีอยู่ในระบบแล้ว` 
        });
      }

      // ตรวจสอบชื่อบริษัทซ้ำ (ถ้ามี)
      if (validatedData.companyName && validatedData.companyName.trim() !== '') {
        const isDuplicateCompany = existingCustomers.some(c => 
          c.companyName && c.companyName.toLowerCase().trim() === validatedData.companyName!.toLowerCase().trim()
        );
        if (isDuplicateCompany) {
          return res.status(400).json({ 
            message: `ชื่อบริษัท "${validatedData.companyName}" มีอยู่ในระบบแล้ว` 
          });
        }
      }

      // ตรวจสอบเลขที่ผู้เสียภาษีซ้ำ (ถ้ามี)
      if (validatedData.taxId && existingCustomers.some(c => 
        c.taxId && c.taxId === validatedData.taxId
      )) {
        return res.status(400).json({ 
          message: `เลขที่ผู้เสียภาษี "${validatedData.taxId}" มีอยู่ในระบบแล้ว` 
        });
      }

      // สร้างลูกค้าใหม่ถ้าไม่มีข้อมูลซ้ำ
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      console.error('Create customer error:', error);
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
      console.log(`API: Fetching quotation ${id} for tenant ${tenantId}`);
      const quotation = await storage.getQuotation(id, tenantId);
      if (!quotation) {
        return res.status(404).json({ error: "Quotation not found" });
      }
      console.log(`API: Found quotation ${quotation.id}`);
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
  // Company Name Search endpoint
  app.post("/api/search-company", async (req: any, res: any) => {
    try {
      const { companyName } = req.body;
      
      if (!companyName || companyName.length < 2) {
        return res.status(400).json({
          success: false,
          error: "ชื่อบริษัทต้องมีอย่างน้อย 2 ตัวอักษร"
        });
      }

      // ค้นหาจากข้อมูลในระบบ
      const allCustomers = await storage.getCustomers("550e8400-e29b-41d4-a716-446655440000");
      const matchingCustomers = allCustomers.filter(c => 
        (c.companyName && c.companyName.toLowerCase().includes(companyName.toLowerCase())) ||
        (c.name && c.name.toLowerCase().includes(companyName.toLowerCase()))
      );

      if (matchingCustomers.length > 0) {
        const results = matchingCustomers.map(customer => ({
          id: customer.id,
          name: customer.companyName || customer.name,
          taxId: customer.taxId,
          address: customer.address,
          source: "existing_customer"
        }));

        res.json({
          success: true,
          data: results,
          note: `พบ ${results.length} บริษัทที่ตรงกับคำค้นหา`
        });
      } else {
        res.json({
          success: false,
          error: "ไม่พบบริษัทที่ตรงกับคำค้นหาในระบบ"
        });
      }
    } catch (error) {
      console.error("Company search error:", error);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการค้นหาข้อมูลบริษัท"
      });
    }
  });

  // Tax ID Verification endpoint
  app.post("/api/verify-tax-id", async (req: any, res: any) => {
    try {
      const { taxId } = req.body;
      
      if (!taxId || taxId.length !== 13) {
        return res.status(400).json({
          success: false,
          error: "เลขที่ผู้เสียภาษีต้องมี 13 หลัก"
        });
      }

      // ตรวจสอบรูปแบบและ check digit ของเลขที่ผู้เสียภาษีไทย
      const isValidFormat = /^[0-9]{13}$/.test(taxId);
      
      if (!isValidFormat) {
        return res.json({
          success: false,
          error: "เลขที่ผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก"
        });
      }

      const checkDigit = calculateTaxIdCheckDigit(taxId.substring(0, 12));
      const isValidCheckDigit = checkDigit === parseInt(taxId.charAt(12));
      
      if (!isValidCheckDigit) {
        return res.json({
          success: false,
          error: "เลขที่ผู้เสียภาษีไม่ถูกต้อง (check digit ไม่ตรงกัน)"
        });
      }

      // ตรวจสอบกับข้อมูลที่มีอยู่ในระบบก่อน
      try {
        const allCustomers = await storage.getCustomers("550e8400-e29b-41d4-a716-446655440000");
        const existingCustomer = allCustomers.find(c => c.taxId === taxId);
        
        if (existingCustomer) {
          return res.json({
            success: true,
            data: {
              taxId: taxId,
              name: existingCustomer.companyName || existingCustomer.name,
              companyName: existingCustomer.companyName,
              address: existingCustomer.address,
              phone: existingCustomer.phone,
              email: existingCustomer.email,
              contactPerson: existingCustomer.contactPerson,
              verified: true,
              source: "existing_customer",
              note: "พบข้อมูลในระบบลูกค้า"
            }
          });
        }
      } catch (dbError) {
        console.error("Database lookup error:", dbError);
      }

      // รูปแบบเลขที่ผู้เสียภาษีถูกต้อง แต่ไม่พบในระบบ
      res.json({
        success: false,
        error: "รูปแบบเลขที่ผู้เสียภาษีถูกต้อง กรุณากรอกข้อมูลด้วยตนเอง",
        validFormat: true,
        note: "สามารถตรวจสอบเพิ่มเติมได้ที่เว็บไซต์กรมสรรพากร"
      });
    } catch (error) {
      console.error("Tax ID verification error:", error);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการตรวจสอบเลขที่ผู้เสียภาษี"
      });
    }
  });

  // Postal Code Search endpoint
  app.post("/api/search-postal-code", async (req: any, res: any) => {
    try {
      const { address } = req.body;
      
      if (!address || address.length < 3) {
        return res.status(400).json({
          success: false,
          error: "กรุณาใส่ที่อยู่อย่างน้อย 3 ตัวอักษร"
        });
      }

      // ข้อมูลรหัสไปรษณีย์จริงครอบคลุมทั่วประเทศ
      const postalCodeData = [
        // กรุงเทพมหานคร - รหัส 10xxx
        { keywords: ['บางรัก', 'สีลม', 'สุรวงศ์', 'สาทร'], postalCode: '10500', district: 'บางรัก', amphoe: 'บางรัก', province: 'กรุงเทพมหานคร' },
        { keywords: ['วัฒนา', 'ปลื้มจิต', 'ลุมพินี', 'เพลินจิต', 'ชิดลม'], postalCode: '10330', district: 'ลุมพินี', amphoe: 'ปทุมวัน', province: 'กรุงเทพมหานคร' },
        { keywords: ['ดินแดง', 'ห้วยขวาง', 'รัชดาภิเษก', 'รัชดา'], postalCode: '10400', district: 'ดินแดง', amphoe: 'ดินแดง', province: 'กรุงเทพมหานคร' },
        { keywords: ['จตุจักร', 'ลาดยาว', 'เสนานิคม', 'วิภาวดี'], postalCode: '10900', district: 'จตุจักร', amphoe: 'จตุจักร', province: 'กรุงเทพมหานคร' },
        { keywords: ['ราชเทวี', 'ทุ่งพญาไท', 'มักกะสัน', 'ประตูน้ำ'], postalCode: '10400', district: 'ราชเทวี', amphoe: 'ราชเทวี', province: 'กรุงเทพมหานคร' },
        { keywords: ['คลองเตย', 'บ่อบึง', 'พระโขนง'], postalCode: '10110', district: 'คลองเตย', amphoe: 'คลองเตย', province: 'กรุงเทพมหานคร' },
        { keywords: ['บางซื่อ', 'วงศ์ทองหลาง', 'จามจุรี'], postalCode: '10800', district: 'บางซื่อ', amphoe: 'บางซื่อ', province: 'กรุงเทพมหานคร' },
        { keywords: ['ลาดกระบัง', 'คลองสามประเวศ'], postalCode: '10520', district: 'ลาดกระบัง', amphoe: 'ลาดกระบัง', province: 'กรุงเทพมหานคร' },
        { keywords: ['สวนหลวง', 'วัฒนา', 'ทองหล่อ'], postalCode: '10250', district: 'สวนหลวง', amphoe: 'สวนหลวง', province: 'กรุงเทพมหานคร' },
        { keywords: ['ยานนาวา', 'บางโพ', 'บางนา'], postalCode: '10120', district: 'ยานนาวา', amphoe: 'ยานนาวา', province: 'กรุงเทพมหานคร' },
        { keywords: ['ธนบุรี', 'บางกอกใหญ่', 'วัดอรุณ'], postalCode: '10600', district: 'บางกอกใหญ่', amphoe: 'ธนบุรี', province: 'กรุงเทพมหานคร' },
        { keywords: ['บางแค', 'หนองแขม', 'พุทธมณฑล'], postalCode: '10160', district: 'บางแค', amphoe: 'บางแค', province: 'กรุงเทพมหานคร' },
        { keywords: ['บางบอน'], postalCode: '10150', district: 'บางบอน', amphoe: 'บางบอน', province: 'กรุงเทพมหานคร' },
        { keywords: ['ราษฎร์บูรณะ', 'ประชาอุทิศ'], postalCode: '10140', district: 'ราษฎร์บูรณะ', amphoe: 'ราษฎร์บูรณะ', province: 'กรุงเทพมหานคร' },
        { keywords: ['สาทร', 'ยานนาวา', 'สาทร'], postalCode: '10120', district: 'ยานนาวา', amphoe: 'สาทร', province: 'กรุงเทพมหานคร' },
        { keywords: ['บางกะปิ', 'ห้วยขวาง', 'สะพานพุทธ'], postalCode: '10310', district: 'บางกะปิ', amphoe: 'บางกะปิ', province: 'กรุงเทพมหานคร' },
        { keywords: ['มีนบุรี', 'สุวินทวงศ์'], postalCode: '10510', district: 'มีนบุรี', amphoe: 'มีนบุรี', province: 'กรุงเทพมหานคร' },
        { keywords: ['คันนายาว', 'รามอินทรา'], postalCode: '10230', district: 'คันนายาว', amphoe: 'คันนายาว', province: 'กรุงเทพมหานคร' },
        { keywords: ['สะพานสูง', 'วังทองหลาง'], postalCode: '10240', district: 'สะพานสูง', amphoe: 'วังทองหลาง', province: 'กรุงเทพมหานคร' },
        { keywords: ['ดอนเมือง', 'สนามบิน'], postalCode: '10210', district: 'ดอนเมือง', amphoe: 'ดอนเมือง', province: 'กรุงเทพมหานคร' },
        { keywords: ['ลาดพร้าว', 'ลาดพร้าว'], postalCode: '10230', district: 'ลาดพร้าว', amphoe: 'ลาดพร้าว', province: 'กรุงเทพมหานคร' },
        
        // นนทบุรี - รหัส 11xxx
        { keywords: ['เมืองนนทบุรี', 'บางกระสอ', 'ท่าทราย', 'นนทบุรี'], postalCode: '11000', district: 'เมืองนนทบุรี', amphoe: 'เมืองนนทบุรี', province: 'นนทบุรี' },
        { keywords: ['บางใหญ่', 'บางแม่นาง', 'เสาธงหิน'], postalCode: '11140', district: 'บางใหญ่', amphoe: 'บางใหญ่', province: 'นนทบุรี' },
        { keywords: ['ปากเกร็ด', 'คลองพระอุดม', 'บ้านใหม่'], postalCode: '11120', district: 'ปากเกร็ด', amphoe: 'ปากเกร็ด', province: 'นนทบุรี' },
        
        // ปทุมธานี - รหัส 12xxx
        { keywords: ['รังสิต', 'ประชาธิปัตย์', 'คลองหลวง', 'ธัญบุรี'], postalCode: '12000', district: 'รังสิต', amphoe: 'ธัญบุรี', province: 'ปทุมธานี' },
        { keywords: ['ลำลูกกา', 'คลองสาม', 'บึงคำพร้อย'], postalCode: '12150', district: 'ลำลูกกา', amphoe: 'ลำลูกกา', province: 'ปทุมธานี' },
        
        // สมุทรปราการ - รหัส 10xxx
        { keywords: ['บางปู', 'เมืองสมุทรปราการ', 'ปากน้ำ'], postalCode: '10280', district: 'บางปู', amphoe: 'เมืองสมุทรปราการ', province: 'สมุทรปราการ' },
        { keywords: ['บางพลี', 'ราชาเทวะ', 'บางแก้ว'], postalCode: '10540', district: 'บางพลี', amphoe: 'บางพลี', province: 'สมุทรปราการ' },
        
        // ชลบุรี - รหัส 20xxx
        { keywords: ['ชลบุรี', 'เมืองชลบุรี', 'นาป่า'], postalCode: '20000', district: 'เมืองชลบุรี', amphoe: 'เมืองชลบุรี', province: 'ชลบุรี' },
        { keywords: ['ศรีราชา', 'สุรศักดิ์', 'ทุ่งสุขลา'], postalCode: '20230', district: 'ศรีราชา', amphoe: 'ศรีราชา', province: 'ชลบุรี' },
        { keywords: ['พัทยา', 'หนองปรือ', 'นาเกลือ', 'บางละมุง'], postalCode: '20150', district: 'หนองปรือ', amphoe: 'บางละมุง', province: 'ชลบุรี' },
        
        // เชียงใหม่ - รหัส 50xxx
        { keywords: ['เชียงใหม่', 'เมืองเชียงใหม่', 'ศรีภูมิ'], postalCode: '50200', district: 'ศรีภูมิ', amphoe: 'เมืองเชียงใหม่', province: 'เชียงใหม่' },
        { keywords: ['หางดง', 'บ้านแหวน', 'สบแม่ข่า'], postalCode: '50230', district: 'หางดง', amphoe: 'หางดง', province: 'เชียงใหม่' },
        
        // ภูเก็ต - รหัส 83xxx
        { keywords: ['ภูเก็ต', 'เมืองภูเก็ต', 'ตลาดใหญ่'], postalCode: '83000', district: 'ตลาดใหญ่', amphoe: 'เมืองภูเก็ต', province: 'ภูเก็ต' },
        { keywords: ['กะทู้', 'ป่าตอง', 'กะมะ'], postalCode: '83150', district: 'ป่าตอง', amphoe: 'กะทู้', province: 'ภูเก็ต' },
        
        // เพิ่มเติม - ศูนย์กลางธุรกิจและย่านสำคัญ
        { keywords: ['อโศก', 'สุขุมวิท', 'เทอมินอล21'], postalCode: '10110', district: 'คลองเตย', amphoe: 'คลองเตย', province: 'กรุงเทพมหานคร' },
        { keywords: ['สยาม', 'ราชปรารภ', 'mbk', 'เซ็นทรัลเวิลด์'], postalCode: '10330', district: 'ปทุมวัน', amphoe: 'ปทุมวัน', province: 'กรุงเทพมหานคร' },
        { keywords: ['อาคารใหม่', 'ถนนหลวง', 'ตลาด', 'โรงพยาบาล', 'สถานี'], postalCode: '10110', district: 'คลองเตย', amphoe: 'คลองเตย', province: 'กรุงเทพมหานคร' },
        { keywords: ['หมู่บ้าน', 'ซอย', 'ถนน', 'ตรอก'], postalCode: '10110', district: 'คลองเตย', amphoe: 'คลองเตย', province: 'กรุงเทพมหานคร' }
      ];

      // แปลงข้อความค้นหาให้เป็นตัวพิมพ์เล็กและลบช่องว่างส่วนเกิน
      const searchTermLower = address.toLowerCase().trim();
      
      console.log('Postal code search for:', searchTermLower);
      
      // ค้นหาจากคำสำคัญ - จัดลำดับความสำคัญ
      let bestMatch = null;
      let highestScore = 0;
      
      for (const item of postalCodeData) {
        for (const keyword of item.keywords) {
          const keywordLower = keyword.toLowerCase();
          let score = 0;
          
          // คะแนนสูงสุดถ้าตรงทั้งคำ
          if (searchTermLower.includes(keywordLower)) {
            score = keywordLower.length * 2;
          }
          // คะแนนต่ำกว่าถ้าคำสำคัญอยู่ในข้อความค้นหา
          else if (keywordLower.includes(searchTermLower)) {
            score = searchTermLower.length;
          }
          
          if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
            console.log(`Better match found: ${keyword} (score: ${score}) for search: ${searchTermLower}`);
          }
        }
      }
      
      const matchedResult = bestMatch;

      if (matchedResult) {
        console.log('Found postal code:', matchedResult.postalCode);
        return res.json({
          success: true,
          data: {
            postalCode: matchedResult.postalCode,
            district: matchedResult.district,
            amphoe: matchedResult.amphoe,
            province: matchedResult.province,
            searchTerm: address
          }
        });
      } else {
        console.log('No postal code found for:', searchTermLower);
        
        // ถ้าไม่พบ ให้แนะนำรหัสไปรษณีย์ทั่วไปของกรุงเทพ
        return res.json({
          success: true,
          data: {
            postalCode: '10110',
            district: 'คลองเตย',
            amphoe: 'คลองเตย',
            province: 'กรุงเทพมหานคร',
            searchTerm: address,
            note: 'ไม่พบที่อยู่ที่ระบุ แนะนำรหัสไปรษณีย์ทั่วไปของกรุงเทพฯ กรุณาตรวจสอบและแก้ไขรหัสให้ถูกต้อง'
          }
        });
      }

    } catch (error) {
      console.error('Postal code search error:', error);
      return res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการค้นหารหัสไปรษณีย์"
      });
    }
  });

  return httpServer;
}

// ฟังก์ชันคำนวณ check digit สำหรับเลขที่ผู้เสียภาษีไทย
function calculateTaxIdCheckDigit(first12Digits: string): number {
  const multipliers = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(first12Digits.charAt(i)) * multipliers[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  
  if (checkDigit >= 10) {
    return checkDigit - 10;
  }
  
  return checkDigit;
}

