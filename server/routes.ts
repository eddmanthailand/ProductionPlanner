import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { insertUserSchema, insertTenantSchema, insertProductSchema, insertTransactionSchema, insertCustomerSchema, insertColorSchema, insertSizeSchema, insertWorkTypeSchema, insertDepartmentSchema, insertTeamSchema, insertWorkStepSchema, insertEmployeeSchema, insertWorkQueueSchema, insertProductionCapacitySchema, insertHolidaySchema, insertWorkOrderSchema } from "@shared/schema";
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

  app.get("/api/quotations/:id/items", async (req: any, res) => {
    try {
      const quotationId = parseInt(req.params.id);
      console.log(`API: Fetching items for quotation ${quotationId}`);
      
      // Mock data for demonstration - in a real app this would come from database
      const mockItems = [
        {
          id: 1,
          quotationId: quotationId,
          productName: "เสื้อยืดคอกลม",
          description: "เสื้อยืดผ้าคอตตอน 100% คุณภาพดี",
          quantity: 100,
          unitPrice: 150,
          totalPrice: 15000,
          specifications: "สีขาว ไซส์ S-XL"
        },
        {
          id: 2,
          quotationId: quotationId,
          productName: "กางเกงยีนส์",
          description: "กางเกงยีนส์ทรงสลิม",
          quantity: 50,
          unitPrice: 450,
          totalPrice: 22500,
          specifications: "สีน้ำเงิน ไซส์ 28-36"
        }
      ];
      
      res.json(mockItems);
    } catch (error) {
      console.error("Error fetching quotation items:", error);
      res.status(500).json({ error: "Failed to fetch quotation items" });
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

  // Organization Management Routes
  
  // Departments
  app.get("/api/departments", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      
      const departments = await storage.getDepartments(tenantId);
      res.json(departments);
    } catch (error) {
      console.error("Get departments error:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";

      const validatedData = insertDepartmentSchema.parse({
        ...req.body,
        tenantId
      });

      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      console.error("Create department error:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  app.put("/api/departments/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      
      const department = await storage.updateDepartment(id, validatedData, tenantId);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error) {
      console.error("Update department error:", error);
      res.status(500).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const deleted = await storage.deleteDepartment(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      console.error("Delete department error:", error);
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Teams (dev mode - bypass auth)
  app.get("/api/teams", async (req: any, res: any) => {
    try {
      console.log("API: Teams endpoint called");
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for dev
      const { departmentId } = req.query;
      
      console.log("API: Fetching teams from database...");
      console.log(`Storage: Getting teams for tenant: ${tenantId}, departmentId: ${departmentId || 'all'}`);
      
      let teams;
      if (departmentId) {
        teams = await storage.getTeamsByDepartment(departmentId as string, tenantId);
      } else {
        teams = await storage.getTeams(tenantId);
      }
      
      console.log(`Storage: Found teams: ${teams.length}`);
      console.log("API: Sending response with teams");
      res.json(teams);
    } catch (error) {
      console.error("Get teams error:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/departments/:departmentId/teams", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { departmentId } = req.params;
      
      const teams = await storage.getTeamsByDepartment(departmentId, tenantId);
      res.json(teams);
    } catch (error) {
      console.error("Get teams by department error:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", authenticateToken, async (req: any, res: any) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      res.status(201).json(team);
    } catch (error) {
      console.error("Create team error:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.put("/api/teams/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { id } = req.params;
      
      const validatedData = insertTeamSchema.partial().parse(req.body);
      
      const team = await storage.updateTeam(id, validatedData, tenantId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      console.error("Update team error:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { id } = req.params;
      
      const deleted = await storage.deleteTeam(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Delete team error:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Work Steps
  app.get("/api/work-steps", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      
      const workSteps = await storage.getWorkSteps(tenantId);
      res.json(workSteps);
    } catch (error) {
      console.error("Get work steps error:", error);
      res.status(500).json({ message: "Failed to fetch work steps" });
    }
  });

  app.get("/api/departments/:departmentId/work-steps", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { departmentId } = req.params;
      
      const workSteps = await storage.getWorkStepsByDepartment(departmentId, tenantId);
      res.json(workSteps);
    } catch (error) {
      console.error("Get work steps by department error:", error);
      res.status(500).json({ message: "Failed to fetch work steps" });
    }
  });

  app.post("/api/work-steps", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const validatedData = insertWorkStepSchema.parse({
        ...req.body,
        tenantId
      });
      const workStep = await storage.createWorkStep(validatedData);
      res.status(201).json(workStep);
    } catch (error) {
      console.error("Create work step error:", error);
      res.status(500).json({ message: "Failed to create work step" });
    }
  });

  app.put("/api/work-steps/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const validatedData = insertWorkStepSchema.partial().parse(req.body);
      
      const workStep = await storage.updateWorkStep(id, validatedData, tenantId);
      if (!workStep) {
        return res.status(404).json({ message: "Work step not found" });
      }
      
      res.json(workStep);
    } catch (error) {
      console.error("Update work step error:", error);
      res.status(500).json({ message: "Failed to update work step" });
    }
  });

  app.delete("/api/work-steps/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const deleted = await storage.deleteWorkStep(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Work step not found" });
      }
      
      res.json({ message: "Work step deleted successfully" });
    } catch (error) {
      console.error("Delete work step error:", error);
      res.status(500).json({ message: "Failed to delete work step" });
    }
  });

  // Employees
  app.get("/api/employees", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      
      const employees = await storage.getEmployees(tenantId);
      res.json(employees);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/by-team/:teamId", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { teamId } = req.params;
      
      const employees = await storage.getEmployeesByTeam(teamId, tenantId);
      res.json(employees);
    } catch (error) {
      console.error("Get employees by team error:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/teams/:teamId/employees", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { teamId } = req.params;
      
      const employees = await storage.getEmployeesByTeam(teamId, tenantId);
      res.json(employees);
    } catch (error) {
      console.error("Get employees by team error:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      const validatedData = insertEmployeeSchema.parse({
        ...req.body,
        tenantId
      });
      
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Create employee error:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { id } = req.params;
      
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      
      const employee = await storage.updateEmployee(id, validatedData, tenantId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json(employee);
    } catch (error) {
      console.error("Update employee error:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { id } = req.params;
      
      const deleted = await storage.deleteEmployee(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error("Delete employee error:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Work Queue routes
  app.get("/api/work-queues", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";

      const workQueues = await storage.getWorkQueues(tenantId);
      res.json(workQueues);
    } catch (error) {
      console.error("Get work queues error:", error);
      res.status(500).json({ message: "Failed to fetch work queues" });
    }
  });

  app.get("/api/work-queues/team/:teamId", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { teamId } = req.params;
      
      const workQueues = await storage.getWorkQueuesByTeam(teamId, tenantId);
      res.json(workQueues);
    } catch (error) {
      console.error("Get work queues by team error:", error);
      res.status(500).json({ message: "Failed to fetch work queues" });
    }
  });

  app.post("/api/work-queues", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      const validatedData = insertWorkQueueSchema.parse({
        ...req.body,
        tenantId
      });
      
      const workQueue = await storage.createWorkQueue(validatedData);
      res.status(201).json(workQueue);
    } catch (error) {
      console.error("Create work queue error:", error);
      res.status(500).json({ message: "Failed to create work queue" });
    }
  });

  app.put("/api/work-queues/:id", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { id } = req.params;
      
      const validatedData = insertWorkQueueSchema.partial().parse(req.body);
      
      const workQueue = await storage.updateWorkQueue(id, validatedData, tenantId);
      if (!workQueue) {
        return res.status(404).json({ message: "Work queue not found" });
      }
      
      res.json(workQueue);
    } catch (error) {
      console.error("Update work queue error:", error);
      res.status(500).json({ message: "Failed to update work queue" });
    }
  });

  app.delete("/api/work-queues/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const deleted = await storage.deleteWorkQueue(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Work queue not found" });
      }
      
      res.json({ message: "Work queue deleted successfully" });
    } catch (error) {
      console.error("Delete work queue error:", error);
      res.status(500).json({ message: "Failed to delete work queue" });
    }
  });

  app.put("/api/work-queues/reorder", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { teamId, queueItems } = req.body;
      
      if (!teamId || !queueItems) {
        return res.status(400).json({ message: "Team ID and queue items are required" });
      }

      // Update priority for each queue item
      for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i];
        await storage.updateWorkQueue(item.id, { priority: i + 1 }, tenantId);
      }
      
      res.json({ message: "Queue reordered successfully" });
    } catch (error) {
      console.error("Reorder work queue error:", error);
      res.status(500).json({ message: "Failed to reorder queue" });
    }
  });

  // Production Capacity routes
  app.get("/api/production-capacity", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      const capacities = await storage.getProductionCapacities(tenantId);
      res.json(capacities);
    } catch (error) {
      console.error("Get production capacities error:", error);
      res.status(500).json({ message: "Failed to fetch production capacities" });
    }
  });

  app.get("/api/production-capacity/team/:teamId", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      const { teamId } = req.params;
      
      const capacity = await storage.getProductionCapacityByTeam(teamId, tenantId);
      res.json(capacity);
    } catch (error) {
      console.error("Get production capacity by team error:", error);
      res.status(500).json({ message: "Failed to fetch production capacity" });
    }
  });

  app.post("/api/production-capacity", authenticateToken, async (req: any, res: any) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID is required" });
      }

      const validatedData = insertProductionCapacitySchema.parse({
        ...req.body,
        tenantId
      });
      
      const capacity = await storage.createProductionCapacity(validatedData);
      res.status(201).json(capacity);
    } catch (error) {
      console.error("Create production capacity error:", error);
      res.status(500).json({ message: "Failed to create production capacity" });
    }
  });

  // Holidays routes
  app.get("/api/holidays", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";

      const holidays = await storage.getHolidays(tenantId);
      res.json(holidays);
    } catch (error) {
      console.error("Get holidays error:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post("/api/holidays", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";

      const validatedData = insertHolidaySchema.parse({
        ...req.body,
        tenantId
      });
      
      const holiday = await storage.createHoliday(validatedData);
      res.status(201).json(holiday);
    } catch (error) {
      console.error("Create holiday error:", error);
      res.status(500).json({ message: "Failed to create holiday" });
    }
  });

  app.delete("/api/holidays/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const deleted = await storage.deleteHoliday(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      res.json({ message: "Holiday deleted successfully" });
    } catch (error) {
      console.error("Delete holiday error:", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // Work Types routes
  app.get("/api/work-types", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";

      const workTypes = await storage.getWorkTypes(tenantId);
      res.json(workTypes);
    } catch (error) {
      console.error("Get work types error:", error);
      res.status(500).json({ message: "Failed to fetch work types" });
    }
  });

  app.post("/api/work-types", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";

      const validatedData = insertWorkTypeSchema.parse({
        ...req.body,
        tenantId
      });
      
      const workType = await storage.createWorkType(validatedData);
      res.status(201).json(workType);
    } catch (error) {
      console.error("Create work type error:", error);
      res.status(500).json({ message: "Failed to create work type" });
    }
  });

  app.put("/api/work-types/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const validatedData = insertWorkTypeSchema.parse({
        ...req.body,
        tenantId
      });
      
      const workType = await storage.updateWorkType(parseInt(id), validatedData, tenantId);
      if (!workType) {
        return res.status(404).json({ message: "Work type not found" });
      }
      
      res.json(workType);
    } catch (error) {
      console.error("Update work type error:", error);
      res.status(500).json({ message: "Failed to update work type" });
    }
  });

  app.delete("/api/work-types/:id", async (req: any, res: any) => {
    try {
      // Dev mode - bypass auth and use default tenant
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const deleted = await storage.deleteWorkType(parseInt(id), tenantId);
      if (!deleted) {
        return res.status(404).json({ message: "Work type not found" });
      }
      
      res.json({ message: "Work type deleted successfully" });
    } catch (error) {
      console.error("Delete work type error:", error);
      res.status(500).json({ message: "Failed to delete work type" });
    }
  });

  // Work Orders routes (dev mode - bypass auth)
  app.get("/api/work-orders", async (req: any, res: any) => {
    try {
      console.log("API: Work orders endpoint called");
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for dev
      
      console.log("API: Fetching work orders from database...");
      console.log(`Storage: Getting work orders for tenant: ${tenantId}`);
      
      const result = await pool.query(
        `SELECT * FROM work_orders WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
      );
      
      // Transform snake_case to camelCase for frontend and fetch sub_jobs
      const workOrders = await Promise.all(result.rows.map(async (row) => {
        // Fetch sub-jobs for each work order
        const subJobsResult = await pool.query(
          `SELECT * FROM sub_jobs WHERE work_order_id = $1 ORDER BY sort_order ASC, created_at ASC`,
          [row.id]
        );
        
        return {
          id: row.id,
          orderNumber: row.order_number,
          quotationId: row.quotation_id,
          customerId: row.customer_id,
          customerName: row.customer_name,
          customerTaxId: row.customer_tax_id,
          customerAddress: row.customer_address,
          customerPhone: row.customer_phone,
          customerEmail: row.customer_email,
          title: row.title,
          description: row.description,
          totalAmount: row.total_amount,
          status: row.status,
          priority: row.priority,
          workTypeId: row.work_type_id,
          startDate: row.start_date,
          deliveryDate: row.delivery_date,
          dueDate: row.due_date,
          completedDate: row.completed_date,
          assignedTeamId: row.assigned_team_id,
          notes: row.notes,
          tenantId: row.tenant_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          sub_jobs: subJobsResult.rows
        };
      }));
      
      console.log(`Storage: Found work orders: ${result.rows.length}`);
      console.log("API: Sending response with work orders");
      res.json(workOrders);
    } catch (error) {
      console.error("Get work orders error:", error);
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  app.get("/api/work-orders/:id", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for dev
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT * FROM work_orders WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      const row = result.rows[0];
      
      // Fetch sub-jobs for this work order
      const subJobsResult = await pool.query(
        `SELECT * FROM sub_jobs WHERE work_order_id = $1 ORDER BY sort_order ASC, created_at ASC`,
        [id]
      );
      
      // Transform to camelCase
      const workOrder = {
        id: row.id,
        orderNumber: row.order_number,
        quotationId: row.quotation_id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerTaxId: row.customer_tax_id,
        customerAddress: row.customer_address,
        customerPhone: row.customer_phone,
        customerEmail: row.customer_email,
        title: row.title,
        description: row.description,
        totalAmount: row.total_amount,
        status: row.status,
        priority: row.priority,
        workTypeId: row.work_type_id,
        startDate: row.start_date,
        deliveryDate: row.delivery_date,
        dueDate: row.due_date,
        completedDate: row.completed_date,
        assignedTeamId: row.assigned_team_id,
        notes: row.notes,
        tenantId: row.tenant_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sub_jobs: subJobsResult.rows
      };
      
      res.json(workOrder);
    } catch (error) {
      console.error("Get work order error:", error);
      res.status(500).json({ message: "Failed to fetch work order" });
    }
  });

  app.post("/api/work-orders", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for dev
      const workOrderData = { ...req.body, tenantId };
      
      console.log("API: Creating work order with data:", workOrderData);
      
      // Generate order number
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM work_orders WHERE tenant_id = $1`,
        [tenantId]
      );
      const orderNumber = `WO${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;
      
      // Get customer info if customerId is provided
      let customerData = {
        customerName: "ไม่ระบุลูกค้า",
        customerTaxId: null,
        customerAddress: null,
        customerPhone: null,
        customerEmail: null
      };
      
      if (workOrderData.customerId) {
        const customerResult = await pool.query(
          `SELECT * FROM customers WHERE id = $1`,
          [workOrderData.customerId]
        );
        
        if (customerResult.rows.length > 0) {
          const customer = customerResult.rows[0];
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
      if (workOrderData.quotationId) {
        const quotationResult = await pool.query(
          `SELECT * FROM quotations WHERE id = $1`,
          [workOrderData.quotationId]
        );
        
        if (quotationResult.rows.length > 0) {
          totalAmount = quotationResult.rows[0].grandTotal || "0.00";
        }
      }
      
      // Insert work order
      const insertResult = await pool.query(
        `INSERT INTO work_orders (
          id, order_number, quotation_id, customer_id, customer_name, customer_tax_id,
          customer_address, customer_phone, customer_email, title, description,
          total_amount, status, priority, delivery_date, notes, tenant_id, work_type_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          `wo_${Date.now()}`, // Generate unique ID
          orderNumber,
          workOrderData.quotationId || null,
          workOrderData.customerId,
          customerData.customerName,
          customerData.customerTaxId,
          customerData.customerAddress,
          customerData.customerPhone,
          customerData.customerEmail,
          workOrderData.title,
          workOrderData.description || null,
          totalAmount,
          "draft", // Default status
          workOrderData.priority || 3,
          workOrderData.deliveryDate || null,
          workOrderData.notes || null,
          tenantId,
          workOrderData.workTypeId || null
        ]
      );
      
      console.log("API: Work order created successfully");
      res.status(201).json(insertResult.rows[0]);
    } catch (error) {
      console.error("Create work order error:", error);
      res.status(500).json({ message: "Failed to create work order" });
    }
  });

  app.put("/api/work-orders/:id", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for dev
      const { id } = req.params;
      const updateData = req.body;
      
      console.log("API: Updating work order:", id, updateData);
      
      const updateResult = await pool.query(
        `UPDATE work_orders SET 
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          start_date = COALESCE($5, start_date),
          delivery_date = COALESCE($6, delivery_date),
          notes = COALESCE($7, notes),
          updated_at = NOW()
        WHERE id = $8 AND tenant_id = $9
        RETURNING *`,
        [
          updateData.title,
          updateData.description,
          updateData.status,
          updateData.priority,
          updateData.startDate,
          updateData.deliveryDate || updateData.dueDate,
          updateData.notes,
          id,
          tenantId
        ]
      );
      
      if (updateResult.rows.length === 0) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Handle sub-jobs (items) update
      if (updateData.items && Array.isArray(updateData.items)) {
        // First, delete production plan items that reference sub-jobs for this work order
        await pool.query(
          `DELETE FROM production_plan_items 
           WHERE sub_job_id IN (
             SELECT id FROM sub_jobs WHERE work_order_id = $1
           )`,
          [id]
        );

        // Then delete existing sub-jobs for this work order
        await pool.query(
          `DELETE FROM sub_jobs WHERE work_order_id = $1`,
          [id]
        );

        // Insert new sub-jobs
        for (let i = 0; i < updateData.items.length; i++) {
          const item = updateData.items[i];
          await pool.query(
            `INSERT INTO sub_jobs (
              work_order_id, product_name, department_id, work_step_id, 
              color_id, size_id, quantity, production_cost, total_cost, 
              status, sort_order, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
            [
              id,
              item.productName || '',
              item.departmentId || null,
              item.workStepId || null,
              item.colorId ? parseInt(item.colorId) : null,
              item.sizeId ? parseInt(item.sizeId) : null,
              item.quantity || 0,
              item.productionCost || 0,
              item.totalCost || 0,
              'pending',
              item.sortOrder || (i + 1)
            ]
          );
        }
      }
      
      console.log("API: Work order updated successfully");
      res.json(updateResult.rows[0]);
    } catch (error) {
      console.error("Update work order error:", error);
      res.status(500).json({ message: "Failed to update work order" });
    }
  });

  app.delete("/api/work-orders/:id", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for dev
      const { id } = req.params;
      
      console.log("API: Deleting work order:", id);
      
      const deleteResult = await pool.query(
        `DELETE FROM work_orders WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      
      if (deleteResult.rowCount === 0) {
        return res.status(404).json({ message: "Work order not found" });
      }
      
      console.log("API: Work order deleted successfully");
      res.json({ message: "Work order deleted successfully" });
    } catch (error) {
      console.error("Delete work order error:", error);
      res.status(500).json({ message: "Failed to delete work order" });
    }
  });

  // Sub-jobs sort order update endpoint
  app.put("/api/work-orders/:workOrderId/sub-jobs/reorder", async (req: any, res: any) => {
    try {
      const { workOrderId } = req.params;
      const { subJobs } = req.body; // Array of sub-jobs with updated sort orders
      
      console.log("API: Updating sub-job sort orders for work order:", workOrderId);
      
      // Update sort orders for each sub-job
      for (let i = 0; i < subJobs.length; i++) {
        const subJob = subJobs[i];
        if (subJob.id) {
          await pool.query(
            `UPDATE sub_jobs SET sort_order = $1 WHERE id = $2 AND work_order_id = $3`,
            [i + 1, subJob.id, workOrderId]
          );
        }
      }
      
      console.log("API: Sub-job sort orders updated successfully");
      res.json({ message: "Sort orders updated successfully" });
    } catch (error) {
      console.error("Update sub-job sort orders error:", error);
      res.status(500).json({ message: "Failed to update sort orders" });
    }
  });

  // Work Orders count endpoint for generating order numbers
  app.post("/api/work-orders/count", async (req: any, res: any) => {
    try {
      const { year, month } = req.body;
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for dev
      
      console.log(`API: Getting work order count for ${year}-${month}`);
      
      // Count work orders for the specific year and month
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM work_orders 
         WHERE tenant_id = $1 
         AND EXTRACT(YEAR FROM created_at) = $2 
         AND EXTRACT(MONTH FROM created_at) = $3`,
        [tenantId, year, month]
      );
      
      const count = parseInt(countResult.rows[0].count) || 0;
      console.log(`API: Found ${count} work orders for ${year}-${month}`);
      
      res.json({ count });
    } catch (error) {
      console.error("Get work order count error:", error);
      res.status(500).json({ message: "Failed to get work order count" });
    }
  });

  // Get work queues by team
  app.get("/api/work-queues/team/:teamId", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { teamId } = req.params;
      
      // Get work queue items for the team with sub job details
      const result = await pool.query(`
        SELECT 
          wq.*,
          sj.work_order_id,
          sj.product_name,
          sj.department_id,
          sj.work_step_id,
          sj.color_id,
          sj.size_id,
          sj.quantity as sub_job_quantity,
          sj.production_cost,
          sj.total_cost,
          wo.order_number,
          wo.customer_name,
          wo.delivery_date
        FROM work_queue wq
        LEFT JOIN sub_jobs sj ON wq.product_name = sj.product_name
        LEFT JOIN work_orders wo ON sj.work_order_id = wo.id
        WHERE wq.team_id = $1 
          AND wq.tenant_id = $2
        ORDER BY wq.priority ASC, wq.created_at ASC
      `, [teamId, tenantId]);

      const teamQueue = result.rows.map(row => ({
        id: row.id || `wq_${Date.now()}_${Math.random()}`,
        workOrderId: row.work_order_id || row.id,
        orderNumber: row.order_number || row.order_number,
        customerName: row.customer_name || "ไม่ระบุลูกค้า",
        deliveryDate: row.delivery_date,
        productName: row.product_name,
        departmentId: row.department_id,
        workStepId: row.work_step_id,
        colorId: row.color_id || 1,
        sizeId: row.size_id || 1,
        quantity: row.sub_job_quantity || row.quantity || 1,
        productionCost: row.production_cost || "0.00",
        totalCost: row.total_cost || "0.00",
        status: row.status || "pending",
        sortOrder: row.priority || 1
      }));

      res.json(teamQueue);
    } catch (error) {
      console.error("Get team work queues error:", error);
      res.status(500).json({ message: "Failed to fetch team work queues" });
    }
  });

  // Get available sub jobs for work step
  app.get("/api/sub-jobs/available", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { workStepId } = req.query;
      
      if (!workStepId) {
        return res.status(400).json({ message: "Work step ID is required" });
      }

      // Get sub jobs that are approved or in progress, for the specified work step
      // Exclude jobs that are already in work queue using sub_job_id
      const result = await pool.query(`
        SELECT 
          sj.*,
          wo.order_number,
          wo.customer_name,
          wo.delivery_date,
          wo.order_number as job_name,
          wo.status as work_order_status
        FROM sub_jobs sj
        INNER JOIN work_orders wo ON sj.work_order_id = wo.id
        WHERE sj.work_step_id = $1 
          AND wo.tenant_id = $2
          AND wo.status IN ('approved', 'in_progress')
          AND sj.status NOT IN ('completed', 'cancelled')

        ORDER BY wo.delivery_date ASC NULLS LAST, wo.created_at ASC
      `, [workStepId, tenantId]);

      const subJobs = result.rows.map(row => ({
        id: row.id,
        workOrderId: row.work_order_id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        deliveryDate: row.delivery_date,
        jobName: row.job_name,
        productName: row.product_name,
        departmentId: row.department_id,
        workStepId: row.work_step_id,
        colorId: row.color_id,
        sizeId: row.size_id,
        quantity: row.quantity,
        productionCost: row.production_cost,
        totalCost: row.total_cost,
        status: row.status,
        sortOrder: row.sort_order
      }));

      res.json(subJobs);
    } catch (error) {
      console.error("Get available sub jobs error:", error);
      res.status(500).json({ message: "Failed to fetch available sub jobs" });
    }
  });

  // Get production capacities
  app.get("/api/production-capacities", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const result = await storage.getProductionCapacities(tenantId);
      res.json(result);
    } catch (error) {
      console.error("Get production capacities error:", error);
      res.status(500).json({ message: "Failed to fetch production capacities" });
    }
  });

  // Add sub job to team queue
  app.post("/api/work-queues/add-job", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { subJobId, teamId, priority } = req.body;

      // Get sub job details
      const subJobResult = await pool.query(
        `SELECT sj.*, wo.order_number, wo.customer_name, wo.delivery_date 
         FROM sub_jobs sj 
         INNER JOIN work_orders wo ON sj.work_order_id = wo.id 
         WHERE sj.id = $1`,
        [subJobId]
      );

      if (subJobResult.rows.length === 0) {
        return res.status(404).json({ message: "Sub job not found" });
      }

      const subJob = subJobResult.rows[0];

      // Add to work queue
      const queueResult = await pool.query(
        `INSERT INTO work_queue (
          id, sub_job_id, team_id, order_number, product_name, quantity, 
          priority, status, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`,
        [
          `wq_${Date.now()}_${Math.random()}`,
          subJobId,
          teamId,
          subJob.order_number,
          subJob.product_name,
          subJob.quantity,
          priority || 1,
          'pending',
          tenantId
        ]
      );

      res.json({ success: true, queueItem: queueResult.rows[0] });
    } catch (error) {
      console.error("Add job to queue error:", error);
      res.status(500).json({ message: "Failed to add job to queue" });
    }
  });

  // Update queue order
  app.put("/api/work-queues/reorder", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { teamId, queueItems } = req.body;

      // Update priorities based on new order
      for (let i = 0; i < queueItems.length; i++) {
        await pool.query(
          `UPDATE work_queue SET priority = $1, updated_at = NOW() 
           WHERE id = $2 AND team_id = $3 AND tenant_id = $4`,
          [i + 1, queueItems[i].id, teamId, tenantId]
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Reorder queue error:", error);
      res.status(500).json({ message: "Failed to reorder queue" });
    }
  });

  // Remove job from queue
  app.delete("/api/work-queues/:queueId", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { queueId } = req.params;

      await pool.query(
        `DELETE FROM work_queue WHERE id = $1 AND tenant_id = $2`,
        [queueId, tenantId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Remove job from queue error:", error);
      res.status(500).json({ message: "Failed to remove job from queue" });
    }
  });

  // Production Plans routes
  app.get('/api/production-plans', async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const plans = await storage.getProductionPlans(tenantId);
      res.json(plans);
    } catch (error) {
      console.error('Get production plans error:', error);
      res.status(500).json({ message: 'Failed to get production plans' });
    }
  });

  app.post('/api/production-plans', async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { teamId, name, startDate, planItems } = req.body;
      
      // Create production plan
      const plan = await storage.createProductionPlan({
        teamId,
        name,
        startDate,
        tenantId: tenantId,
        status: 'active'
      });

      // Create plan items
      if (planItems && planItems.length > 0) {
        for (const item of planItems) {
          await storage.createProductionPlanItem({
            planId: plan.id,
            subJobId: item.subJobId,
            orderNumber: item.orderNumber,
            customerName: item.customerName,
            productName: item.productName,
            colorName: item.colorName,
            sizeName: item.sizeName,
            quantity: item.quantity,
            completionDate: item.completionDate,
            jobCost: item.jobCost,
            priority: item.priority
          });
        }
      }

      res.json({ success: true, plan });
    } catch (error) {
      console.error('Create production plan error:', error);
      res.status(500).json({ message: 'Failed to create production plan' });
    }
  });

  app.get('/api/production-plans/:id/items', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const items = await storage.getProductionPlanItems(id);
      res.json(items);
    } catch (error) {
      console.error('Get production plan items error:', error);
      res.status(500).json({ message: 'Failed to get production plan items' });
    }
  });

  app.delete('/api/production-plans/:id', async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      const success = await storage.deleteProductionPlan(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: 'Production plan not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Delete production plan error:', error);
      res.status(500).json({ message: 'Failed to delete production plan' });
    }
  });

  // Daily Work Logs endpoints
  app.get("/api/daily-work-logs", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { date, teamId } = req.query;
      
      console.log("API: Daily work logs requested with filters:", { date, teamId, tenantId });
      
      const logs = await storage.getDailyWorkLogs(tenantId, { date, teamId });
      console.log("API: Found daily work logs:", logs.length);
      
      res.json(logs);
    } catch (error) {
      console.error("Get daily work logs error:", error);
      res.status(500).json({ message: "Failed to fetch daily work logs" });
    }
  });

  app.post("/api/daily-work-logs", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const logData = { ...req.body, tenantId };
      
      const log = await storage.createDailyWorkLog(logData);
      res.json(log);
    } catch (error) {
      console.error("Create daily work log error:", error);
      res.status(500).json({ message: "Failed to create daily work log" });
    }
  });

  app.put("/api/daily-work-logs/:id", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      const log = await storage.updateDailyWorkLog(id, req.body, tenantId);
      res.json(log);
    } catch (error) {
      console.error("Update daily work log error:", error);
      res.status(500).json({ message: "Failed to update daily work log" });
    }
  });

  app.get("/api/sub-jobs/by-work-order/:workOrderId", async (req: any, res: any) => {
    try {
      const { workOrderId } = req.params;
      const subJobs = await storage.getSubJobsByWorkOrder(workOrderId);
      res.json(subJobs);
    } catch (error) {
      console.error("Get sub jobs by work order error:", error);
      res.status(500).json({ message: "Failed to fetch sub jobs" });
    }
  });

  // Get sub jobs progress with completed quantities
  app.get("/api/sub-jobs/progress/:workOrderId", async (req: any, res: any) => {
    try {
      const { workOrderId } = req.params;
      
      const result = await pool.query(`
        SELECT 
          sj.id, 
          sj.product_name,
          sj.quantity as quantity_total,
          sj.color_id,
          sj.size_id,
          c.name as color_name,
          s.name as size_name,
          COALESCE(SUM(dwl.quantity_completed), 0) as quantity_completed,
          (sj.quantity - COALESCE(SUM(dwl.quantity_completed), 0)) as quantity_remaining,
          CASE 
            WHEN sj.quantity > 0 THEN 
              ROUND((COALESCE(SUM(dwl.quantity_completed), 0) * 100.0 / sj.quantity), 1)
            ELSE 0 
          END as progress_percentage
        FROM sub_jobs sj
        LEFT JOIN daily_work_logs dwl ON sj.id = dwl.sub_job_id
        LEFT JOIN colors c ON sj.color_id = c.id
        LEFT JOIN sizes s ON sj.size_id = s.id
        WHERE sj.work_order_id = $1
        GROUP BY sj.id, sj.product_name, sj.quantity, sj.color_id, sj.size_id, c.name, s.name, sj.sort_order
        ORDER BY sj.sort_order
      `, [workOrderId]);
      
      const progress = result.rows.map((row: any) => ({
        id: row.id,
        productName: row.product_name,
        quantity: parseInt(row.quantity_total),
        quantityCompleted: parseInt(row.quantity_completed),
        quantityRemaining: parseInt(row.quantity_remaining),
        progressPercentage: parseFloat(row.progress_percentage),
        colorId: row.color_id,
        sizeId: row.size_id,
        colorName: row.color_name,
        sizeName: row.size_name
      }));
      
      res.json(progress);
    } catch (error) {
      console.error("Get sub jobs progress error:", error);
      res.status(500).json({ message: "Failed to fetch sub jobs progress" });
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

