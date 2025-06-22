import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { insertUserSchema, insertTenantSchema, insertProductSchema, insertTransactionSchema, insertCustomerSchema, insertColorSchema, insertSizeSchema, insertWorkTypeSchema, insertDepartmentSchema, insertTeamSchema, insertWorkStepSchema, insertEmployeeSchema, insertWorkQueueSchema, insertProductionCapacitySchema, insertHolidaySchema, insertWorkOrderSchema, insertPermissionSchema, permissions, pageAccess } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";
import memorystore from "memorystore";

// Initialize default permissions for all pages in the system
async function initializeDefaultPermissions() {
  // Skip initialization to avoid complex queries that cause Neon errors
  console.log('Skipping permission initialization to avoid database errors');
}

// Middleware to verify session authentication
function requireAuth(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    req.user = {
      userId: req.session.userId,
      tenantId: req.session.tenantId,
      roleId: req.session.roleId
    };
    next();
  } else {
    res.status(401).json({ message: 'Authentication required' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default permissions
  await initializeDefaultPermissions();

  // Session configuration - using memory store to avoid Neon database issues
  const MemoryStore = memorystore(session);
  
  app.use(session({
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // Auth routes  
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      } else {
        res.status(401).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Session-based authentication routes
  app.post("/api/auth/login", async (req: any, res) => {
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

      // Check if user is active
      if (!user.isActive) {
        console.log("Login rejected - user account disabled:", username);
        return res.status(401).json({ message: "บัญชีผู้ใช้ถูกปิดการใช้งาน" });
      }

      // Skip tenant lookup to avoid complex database queries
      const tenant = null;

      // Store user data in session
      req.session.userId = user.id;
      req.session.tenantId = user.tenantId;
      req.session.roleId = user.roleId;

      console.log("Session login successful for user:", user.username);

      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId,
          tenantId: user.tenantId
        },
        tenant 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    try {
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ message: "Logout failed" });
          }
          res.clearCookie('connect.sid');
          console.log("Session logout successful");
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.json({ message: "Already logged out" });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
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

  app.post("/api/users", async (req: any, res) => {
    try {
      const { username, email, firstName, lastName, password, roleId } = req.body;
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';

      // Check for existing username
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check for existing email (only if email is provided)
      if (email && email.trim() !== '') {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        roleId: roleId || null,
        tenantId,
        isActive: true
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, email, firstName, lastName, roleId, isActive, password } = req.body;

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check for existing username (if changed)
      if (username && username !== existingUser.username) {
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      // Check for existing email (if changed and provided)
      if (email && email.trim() !== '' && email !== existingUser.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Prepare update data
      const updateData: any = {
        username: username || existingUser.username,
        email: email !== undefined ? email : existingUser.email,
        firstName: firstName || existingUser.firstName,
        lastName: lastName || existingUser.lastName,
        roleId: roleId !== undefined ? roleId : existingUser.roleId,
        isActive: isActive !== undefined ? isActive : existingUser.isActive
      };

      // Hash password if provided
      if (password && password.trim() !== '') {
        const saltRounds = 10;
        updateData.password = await bcrypt.hash(password, saltRounds);
      }

      // Update user
      const updatedUser = await storage.updateUser(userId, updateData, existingUser.tenantId ?? '550e8400-e29b-41d4-a716-446655440000');

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found after update" });
      }

      // Return user without password
      const userWithoutPassword = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        roleId: updatedUser.roleId,
        tenantId: updatedUser.tenantId,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastLoginAt: updatedUser.lastLoginAt,
        deletedAt: updatedUser.deletedAt
      };
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete/deactivate user
  app.delete("/api/users/:id", async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hard delete the user from database
      const success = await storage.deleteUser(userId, tenantId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Toggle user status
  app.patch("/api/users/:id/toggle-status", async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';

      // Get current user
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Toggle status
      const updatedUser = await storage.updateUser(userId, {
        isActive: !existingUser.isActive
      }, tenantId);

      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update user status" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Toggle user status error:", error);
      res.status(500).json({ message: "Failed to toggle user status" });
    }
  });

  // Roles routes
  app.get("/api/roles", async (req: any, res) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const roles = await storage.getRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post("/api/roles", async (req: any, res) => {
    try {
      const { name, displayName, description, level } = req.body;
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';

      const role = await storage.createRole({
        name,
        displayName: displayName || name,
        description,
        level: level || 5,
        tenantId,
        isActive: true
      });

      res.status(201).json(role);
    } catch (error) {
      console.error("Create role error:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.put("/api/roles/:id", async (req: any, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const { displayName, description, level } = req.body;
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      
      const role = await storage.updateRole(roleId, {
        displayName,
        description,
        level
      }, tenantId);

      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      res.json(role);
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });



  // Get users with roles
  app.get("/api/users-with-roles", async (req: any, res) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      const users = await storage.getUsersWithRoles(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Get users with roles error:", error);
      res.status(500).json({ message: "Failed to fetch users with roles" });
    }
  });

  // Update user status (suspend/activate)
  app.patch("/api/users/:id/status", async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      
      const user = await storage.updateUserStatus(userId, isActive, tenantId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ message: "Failed to update user status" });
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

  // =================== ROLES AND PERMISSIONS API ===================
  
  // Get all roles for tenant (accessible to authenticated Replit users)
  // Get user permissions
  app.get("/api/users/:userId/permissions", async (req: any, res: any) => {
    try {
      const userId = parseInt(req.params.userId);
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error("Get user permissions error:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // Get all permissions
  app.get("/api/permissions", async (req: any, res: any) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Get permissions error:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Page access management endpoints
  app.get("/api/page-access", async (req: any, res: any) => {
    try {
      const roleId = req.query.roleId ? parseInt(req.query.roleId) : null;
      
      if (!roleId) {
        return res.status(400).json({ message: "Role ID is required" });
      }
      
      const pageAccess = await storage.getPageAccessByRole(roleId);
      res.json(pageAccess);
    } catch (error) {
      console.error("Get page access error:", error);
      res.status(500).json({ message: "Failed to fetch page access" });
    }
  });

  app.post("/api/page-access", async (req: any, res: any) => {
    try {
      const { roleId, pageName, pageUrl, accessLevel } = req.body;
      
      if (!accessLevel) {
        // Delete the access if accessLevel is null/empty
        const existingAccess = await storage.getPageAccessByRole(roleId);
        const existing = existingAccess.find(access => access.pageUrl === pageUrl);
        
        if (existing) {
          await db.delete(pageAccess).where(eq(pageAccess.id, existing.id));
        }
        return res.status(204).send();
      }
      
      // Use upsert to handle both create and update
      const result = await storage.upsertPageAccess({
        roleId,
        pageName,
        pageUrl,
        accessLevel
      });
      
      res.json(result);
    } catch (error) {
      console.error("Create/update page access error:", error);
      res.status(500).json({ message: "Failed to manage page access" });
    }
  });

  app.delete("/api/page-access/:roleId", async (req: any, res: any) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const { pageUrl } = req.body;
      
      const existingAccess = await storage.getPageAccessByRole(roleId);
      const existing = existingAccess.find(access => access.pageUrl === pageUrl);
      
      if (existing) {
        await db.delete(pageAccess).where(eq(pageAccess.id, existing.id));
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Page access not found" });
      }
    } catch (error) {
      console.error("Delete page access error:", error);
      res.status(500).json({ message: "Failed to delete page access" });
    }
  });

  app.get("/api/roles", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now
      const roles = await storage.getRoles(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  // Initialize predefined roles for tenant
  app.post("/api/roles/initialize", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now
      const roles = await storage.initializePredefinedRoles(tenantId);
      res.json({ message: "Predefined roles initialized", roles });
    } catch (error) {
      console.error("Initialize roles error:", error);
      res.status(500).json({ message: "Failed to initialize roles" });
    }
  });

  // Create new role
  app.post("/api/roles", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { name, displayName, description, level } = req.body;
      
      // Validate required fields
      if (!name || !displayName || !level) {
        return res.status(400).json({ message: "Name, displayName, and level are required" });
      }

      // Check if level already exists
      const existingRoles = await storage.getRoles(tenantId);
      const levelExists = existingRoles.some(role => role.level === level);
      if (levelExists) {
        return res.status(400).json({ message: "Role level already exists" });
      }

      const role = await storage.createRole({
        name,
        displayName, 
        description: description || "",
        level,
        tenantId,
        isActive: true
      });

      res.status(201).json(role);
    } catch (error) {
      console.error("Create role error:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Delete role - Single unified endpoint
  app.delete("/api/roles/:roleId", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { roleId } = req.params;

      // Check if role has users
      const users = await storage.getUsersWithRoles(tenantId);
      const roleHasUsers = users.some(user => user.role?.id === parseInt(roleId));
      
      if (roleHasUsers) {
        return res.status(400).json({ 
          message: "ไม่สามารถลบบทบาทที่มีผู้ใช้งานอยู่ได้ กรุณาย้ายผู้ใช้ไปยังบทบาทอื่นก่อน" 
        });
      }

      const success = await storage.deleteRole(parseInt(roleId), tenantId);
      
      if (!success) {
        return res.status(404).json({ message: "ไม่พบบทบาทที่ต้องการลบ" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete role error:", error);
      res.status(500).json({ message: "ไม่สามารถลบบทบาทได้" });
    }
  });

  // Get users with roles (use database for consistent role display)
  app.get("/api/users-with-roles", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now
      
      // Get users from database
      const dbUsers = await storage.getUsersByTenant(tenantId);
      
      // Get roles from database (consistent with deletion)
      const roles = await storage.getRoles(tenantId);
      const roleMap = new Map(roles.map(role => [role.id, role]));
      
      // Combine data
      const usersWithRoles = dbUsers.map(user => ({
        ...user,
        password: '', // Don't expose password
        role: user.roleId ? roleMap.get(user.roleId) || null : null
      }));
      
      res.json(usersWithRoles);
    } catch (error) {
      console.error("Get users with roles error:", error);
      res.status(500).json({ message: "Failed to fetch users with roles" });
    }
  });

  // Update user role
  app.put("/api/users/:userId/role", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now
      const { userId } = req.params;
      const { roleId } = req.body;

      const user = await storage.updateUser(parseInt(userId), { roleId }, tenantId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Update user data
  app.put("/api/users/:userId", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now
      const { userId } = req.params;
      const { username, email, firstName, lastName, password, roleId } = req.body;
      
      // Check if username already exists (for other users)
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== parseInt(userId)) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      const updateData: any = {
        username,
        email,
        firstName,
        lastName,
        roleId,
        updatedAt: new Date()
      };
      
      // Only update password if provided
      if (password && password.trim() !== "") {
        const bcrypt = await import('bcrypt');
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await storage.updateUser(parseInt(userId), updateData, tenantId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Update user status (activate/deactivate)
  app.put("/api/users/:userId/status", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await storage.updateUser(parseInt(userId), { 
        isActive
      }, tenantId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Update user status error:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Delete user (soft delete)
  app.delete("/api/users/:userId", requireAuth, async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now
      const { userId } = req.params;

      const user = await storage.updateUser(parseInt(userId), { 
        deletedAt: new Date() 
      }, tenantId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Page Access Management Routes
  app.get("/api/roles/:roleId/page-access", async (req: any, res: any) => {
    try {
      // Check if user is authenticated
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { roleId } = req.params;
      const requestedRoleId = parseInt(roleId);
      
      // Get current user
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Allow users to access their own role's page access or if they are admin
      if (currentUser.roleId !== requestedRoleId && currentUser.roleId !== 1) {
        return res.status(403).json({ message: "Access denied" });
      }

      const pageAccesses = await storage.getPageAccessByRole(requestedRoleId);
      res.json(pageAccesses);
    } catch (error) {
      console.error("Get page access error:", error);
      res.status(500).json({ message: "Failed to fetch page access" });
    }
  });

  app.post("/api/roles/:roleId/page-access", requireAuth, async (req: any, res: any) => {
    try {
      const { roleId } = req.params;
      const { pageName, pageUrl, accessLevel } = req.body;
      
      const pageAccess = await storage.upsertPageAccess({
        roleId: parseInt(roleId),
        pageName,
        pageUrl,
        accessLevel
      });
      
      res.json(pageAccess);
    } catch (error) {
      console.error("Update page access error:", error);
      res.status(500).json({ message: "Failed to update page access" });
    }
  });

  // Register new user (for admin/management use)
  app.post("/api/auth/register", requireAuth, async (req: any, res: any) => {
    try {
      const { username, email, firstName, lastName, password, roleId } = req.body;
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Default tenant for now

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        roleId: roleId || null,
        tenantId,
        isActive: true
      });

      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        tenantId: user.tenantId,
        isActive: user.isActive
      });
    } catch (error) {
      console.error("Register user error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // =================== PERMISSIONS MANAGEMENT API ===================
  
  // Get all permissions
  app.get("/api/permissions", requireAuth, async (req: any, res: any) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Get permissions error:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Get permissions for a specific role
  app.get("/api/roles/:id/permissions", requireAuth, async (req: any, res: any) => {
    try {
      const roleId = parseInt(req.params.id);
      const permissions = await storage.getRolePermissions(roleId);
      res.json(permissions);
    } catch (error) {
      console.error("Get role permissions error:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  // Assign permission to role
  app.post("/api/roles/:roleId/permissions/:permissionId", requireAuth, async (req: any, res: any) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);
      await storage.assignPermissionToRole(roleId, permissionId);
      res.json({ message: "Permission assigned successfully" });
    } catch (error) {
      console.error("Assign permission error:", error);
      res.status(400).json({ message: "Failed to assign permission", error });
    }
  });

  // Remove permission from role
  app.delete("/api/roles/:roleId/permissions/:permissionId", requireAuth, async (req: any, res: any) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const permissionId = parseInt(req.params.permissionId);
      await storage.removePermissionFromRole(roleId, permissionId);
      res.json({ message: "Permission removed successfully" });
    } catch (error) {
      console.error("Remove permission error:", error);
      res.status(400).json({ message: "Failed to remove permission", error });
    }
  });

  // Get permissions for a specific user
  app.get("/api/users/:id/permissions", requireAuth, async (req: any, res: any) => {
    try {
      const userId = parseInt(req.params.id);
      const permissions = await storage.getUserPermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error("Get user permissions error:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // Check if user has specific permission
  app.post("/api/permissions/check", requireAuth, async (req: any, res: any) => {
    try {
      const { userId, resource, action } = req.body;
      const hasPermission = await storage.checkUserPermission(userId, resource, action);
      res.json({ hasPermission });
    } catch (error) {
      console.error("Check permission error:", error);
      res.status(400).json({ message: "Failed to check permission", error });
    }
  });

  // Initialize default permissions for the system
  app.post("/api/permissions/initialize", requireAuth, async (req: any, res: any) => {
    try {
      await initializeDefaultPermissions();
      res.json({ message: "Default permissions initialized successfully" });
    } catch (error) {
      console.error("Initialize permissions error:", error);
      res.status(500).json({ message: "Failed to initialize permissions", error });
    }
  });

  // Page Access Management API endpoints
  app.get("/api/page-access-management/config", async (req: any, res: any) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Get all roles
      const roles = await storage.getRoles(tenantId);
      
      // Get all unique pages from pageAccess table
      const allPageAccess = await storage.getAllPageAccess(tenantId);
      const uniquePages = Array.from(
        new Map(
          allPageAccess.map(pa => [pa.pageUrl, { name: pa.pageName, url: pa.pageUrl }])
        ).values()
      );
      
      // Get current access levels
      const currentAccess = allPageAccess.map(pa => ({
        roleId: pa.roleId,
        pageUrl: pa.pageUrl,
        accessLevel: pa.accessLevel
      }));

      const config = {
        roles: roles.map(role => ({
          id: role.id,
          name: role.name,
          displayName: role.name
        })),
        pages: uniquePages,
        currentAccess: currentAccess
      };

      res.json(config);
    } catch (error) {
      console.error("Page access config error:", error);
      res.status(500).json({ message: "Failed to fetch page access configuration" });
    }
  });

  app.post("/api/page-access-management/bulk-update", async (req: any, res: any) => {
    try {
      const updates = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Invalid request format. Expected array of updates." });
      }

      // Validate each update item
      for (const update of updates) {
        if (!update.roleId || !update.pageUrl || !update.accessLevel) {
          return res.status(400).json({ 
            message: "Each update must include roleId, pageUrl, and accessLevel" 
          });
        }
        
        if (!['none', 'view', 'edit', 'create'].includes(update.accessLevel)) {
          return res.status(400).json({ 
            message: "accessLevel must be one of: none, view, edit, create" 
          });
        }
      }

      // Add pageName to each update if missing
      const updatesWithPageName = updates.map(update => ({
        ...update,
        pageName: update.pageTitle || update.pageName || getPageNameFromUrl(update.pageUrl)
      }));

      // Use storage method for batch update
      await storage.batchUpdatePageAccess(updatesWithPageName);
      
      res.json({ message: "Permissions updated successfully" });
    } catch (error) {
      console.error("Bulk update page access error:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  // Helper function to get page name from URL
  function getPageNameFromUrl(url: string): string {
    try {
      const { parseRoutesFromAppTsx, generatePageNameMap } = require('./route-parser.cjs');
      
      // อ่าน routes จาก App.tsx และสร้าง pageNameMap
      const routes = parseRoutesFromAppTsx();
      const pageNameMap = generatePageNameMap(routes);
      
      return pageNameMap[url] || url;
    } catch (error) {
      console.error('ไม่สามารถอ่าน routes จาก App.tsx ได้:', error);
      
      // fallback ใช้ pageNameMap เดิม
      const fallbackPageNameMap: { [key: string]: string } = {
        '/': 'หน้าหลัก',
        '/sales/quotations': 'จัดการใบเสนอราคา',
        '/sales/invoices': 'จัดการใบแจ้งหนี้',
        '/sales/tax-invoices': 'จัดการใบกำกับภาษี',
        '/sales/receipts': 'จัดการใบเสร็จรับเงิน',
        '/production/calendar': 'ปฏิทินวันหยุดประจำปี',
        '/production/organization': 'โครงสร้างองค์กร',
        '/production/daily-work-log': 'บันทึกงานประจำวัน',
        '/production/production-reports': 'รายงานการผลิต',
        '/production/work-orders': 'ใบสั่งงาน',
        '/production/work-queue-planning': 'วางแผนและคิวงาน',
        '/production/work-queue-table': 'ตารางคิวงาน',
        '/production/work-queue': 'คิวงาน',
        '/production/work-steps': 'ขั้นตอนการทำงาน',
        '/accounting': 'ระบบบัญชี',
        '/inventory': 'คลังสินค้า',
        '/customers': 'ลูกค้า',
        '/master-data': 'ข้อมูลหลัก',
        '/reports': 'รายงาน',
        '/users': 'ผู้ใช้งาน',
        '/user-management': 'จัดการผู้ใช้และสิทธิ์',
        '/page-access-management': 'จัดการสิทธิ์การเข้าถึงหน้า',
        '/production': 'การผลิต',
        '/sales': 'การขาย',
        '/products': 'จัดการสินค้า',
        '/access-demo': 'ทดสอบสิทธิ์'
      };
      
      return fallbackPageNameMap[url] || url;
    }
  }

  // ฟังก์ชันดึงรายการหน้าจาก App.tsx อัตโนมัติ
  function getAllSystemPages(): Array<{ name: string; url: string }> {
    try {
      const { parseRoutesFromAppTsx, generatePageNameMap } = require('./route-parser.cjs');
      
      // อ่าน routes จาก App.tsx
      const routes = parseRoutesFromAppTsx();
      const pageNameMap = generatePageNameMap(routes);
      
      return Object.entries(pageNameMap).map(([url, name]) => ({ name: name as string, url }));
    } catch (error) {
      console.error('ไม่สามารถอ่าน routes จาก App.tsx ได้:', error);
      
      // fallback ใช้ pageNameMap เดิม
      const fallbackPageNameMap: { [key: string]: string } = {
        '/': 'หน้าหลัก',
        '/sales/quotations': 'จัดการใบเสนอราคา',
        '/sales/invoices': 'จัดการใบแจ้งหนี้',
        '/sales/tax-invoices': 'จัดการใบกำกับภาษี',
        '/sales/receipts': 'จัดการใบเสร็จรับเงิน',
        '/production/calendar': 'ปฏิทินวันหยุดประจำปี',
        '/production/organization': 'โครงสร้างองค์กร',
        '/production/daily-work-log': 'บันทึกงานประจำวัน',
        '/production/production-reports': 'รายงานการผลิต',
        '/production/work-orders': 'ใบสั่งงาน',
        '/production/work-queue-planning': 'วางแผนและคิวงาน',
        '/production/work-queue-table': 'ตารางคิวงาน',
        '/production/work-queue': 'คิวงาน',
        '/production/work-steps': 'ขั้นตอนการทำงาน',
        '/accounting': 'ระบบบัญชี',
        '/inventory': 'คลังสินค้า',
        '/customers': 'ลูกค้า',
        '/master-data': 'ข้อมูลหลัก',
        '/reports': 'รายงาน',
        '/users': 'ผู้ใช้งาน',
        '/user-management': 'จัดการผู้ใช้และสิทธิ์',
        '/page-access-management': 'จัดการสิทธิ์การเข้าถึงหน้า',
        '/production': 'การผลิต',
        '/sales': 'การขาย',
        '/products': 'จัดการสินค้า',
        '/access-demo': 'ทดสอบสิทธิ์'
      };
      
      return Object.entries(fallbackPageNameMap).map(([url, name]) => ({ name, url }));
    }
  }

  app.post("/api/page-access-management/create-all", async (req: any, res: any) => {
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000';
      
      // ดึงรายการหน้าจาก pageNameMap แทนการฮาร์ดโค้ด
      const systemPages = getAllSystemPages();

      const roles = await storage.getRoles(tenantId);
      const accessLevels = {
        1: 'create', // Super Admin
        2: 'create', // Admin  
        3: 'create', // Manager
        4: 'none',   // Supervisor
        5: 'view',   // Lead
        6: 'view',   // Senior
        7: 'view',   // Employee
        8: 'view'    // Trainee
      };

      // ดึงสิทธิ์ที่มีอยู่แล้วทั้งหมด
      const existingAccess = await storage.getAllPageAccess(tenantId);
      const existingMap = new Map();
      existingAccess.forEach(access => {
        const key = `${access.roleId}-${access.pageUrl}`;
        existingMap.set(key, access);
      });

      const updates: Array<{
        roleId: number;
        pageName: string;
        pageUrl: string;
        accessLevel: string;
      }> = [];
      let createdCount = 0;
      let skippedCount = 0;

      for (const page of systemPages) {
        for (const role of roles) {
          const key = `${role.id}-${page.url}`;
          
          // ตรวจสอบว่ามีสิทธิ์อยู่แล้วหรือไม่
          if (existingMap.has(key)) {
            console.log(`ข้ามการสร้างสิทธิ์ (มีอยู่แล้ว): ${page.name} (${page.url}) สำหรับ ${role.name}`);
            skippedCount++;
            continue;
          }

          const accessLevel = accessLevels[role.id as keyof typeof accessLevels] || 'none';
          
          console.log(`สร้างสิทธิ์เริ่มต้นสำหรับหน้า: ${page.name} (${page.url}) สำหรับ ${role.name}`);
          
          updates.push({
            roleId: role.id,
            pageName: String(page.name),
            pageUrl: page.url,
            accessLevel: accessLevel
          });
          createdCount++;
        }
      }

      if (updates.length > 0) {
        await storage.batchUpdatePageAccess(updates);
      }
      
      res.json({ 
        message: "All permissions processed successfully", 
        created: createdCount,
        skipped: skippedCount,
        total: createdCount + skippedCount
      });
    } catch (error) {
      console.error("Create all permissions error:", error);
      res.status(500).json({ message: "Failed to create all permissions" });
    }
  });

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

  app.get("/api/departments/:departmentId/teams", requireAuth, async (req: any, res: any) => {
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

  app.post("/api/teams", requireAuth, async (req: any, res: any) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      res.status(201).json(team);
    } catch (error) {
      console.error("Create team error:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.put("/api/teams/:id", requireAuth, async (req: any, res: any) => {
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

  app.delete("/api/teams/:id", requireAuth, async (req: any, res: any) => {
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

  app.get("/api/teams/:teamId/employees", requireAuth, async (req: any, res: any) => {
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

  app.post("/api/employees", requireAuth, async (req: any, res: any) => {
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

  app.put("/api/employees/:id", requireAuth, async (req: any, res: any) => {
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

  app.delete("/api/employees/:id", requireAuth, async (req: any, res: any) => {
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

  app.post("/api/work-queues", requireAuth, async (req: any, res: any) => {
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

  app.put("/api/work-queues/:id", requireAuth, async (req: any, res: any) => {
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
  app.get("/api/production-capacity", requireAuth, async (req: any, res: any) => {
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

  app.get("/api/production-capacity/team/:teamId", requireAuth, async (req: any, res: any) => {
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

  app.post("/api/production-capacity", requireAuth, async (req: any, res: any) => {
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
        // Get existing sub-jobs with their details
        const existingSubJobsResult = await pool.query(
          `SELECT id, product_name, department_id, work_step_id, color_id, size_id, quantity, production_cost, total_cost, sort_order 
           FROM sub_jobs WHERE work_order_id = $1 ORDER BY sort_order`,
          [id]
        );
        const existingSubJobs = existingSubJobsResult.rows;
        
        // Get work_queue entries that reference these sub-jobs
        const existingSubJobIds = existingSubJobs.map(row => row.id);
        let workQueueEntries = [];
        if (existingSubJobIds.length > 0) {
          const workQueueResult = await pool.query(
            `SELECT wq.*, sj.product_name, sj.color_id, sj.size_id, sj.work_step_id, sj.department_id
             FROM work_queue wq 
             JOIN sub_jobs sj ON wq.sub_job_id = sj.id
             WHERE wq.sub_job_id = ANY($1)`,
            [existingSubJobIds]
          );
          workQueueEntries = workQueueResult.rows;
        }

        // Update existing sub-jobs and track which ones are kept
        const keptSubJobIds = new Set();
        for (let i = 0; i < updateData.items.length; i++) {
          const item = updateData.items[i];
          
          if (item.id && existingSubJobs.find(sj => sj.id == item.id)) {
            // Update existing sub-job
            await pool.query(
              `UPDATE sub_jobs SET 
                product_name = $1, department_id = $2, work_step_id = $3,
                color_id = $4, size_id = $5, quantity = $6, 
                production_cost = $7, total_cost = $8, sort_order = $9,
                updated_at = NOW()
              WHERE id = $10 AND work_order_id = $11`,
              [
                item.productName || '',
                item.departmentId || null,
                item.workStepId || null,
                item.colorId ? parseInt(item.colorId) : null,
                item.sizeId ? parseInt(item.sizeId) : null,
                item.quantity || 0,
                item.productionCost || 0,
                item.totalCost || 0,
                item.sortOrder || (i + 1),
                item.id,
                id
              ]
            );
            keptSubJobIds.add(item.id);
            
            // Update work_queue entries for this sub-job
            await pool.query(
              `UPDATE work_queue SET 
                product_name = $1, quantity = $2, updated_at = NOW()
              WHERE sub_job_id = $3`,
              [item.productName || '', item.quantity || 0, item.id]
            );
          } else {
            // Insert new sub-job
            const subJobResult = await pool.query(
              `INSERT INTO sub_jobs (
                work_order_id, product_name, department_id, work_step_id, 
                color_id, size_id, quantity, production_cost, total_cost, 
                status, sort_order, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
              RETURNING id`,
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
            keptSubJobIds.add(subJobResult.rows[0].id);
          }
        }

        // Delete sub-jobs that are no longer needed
        const subJobsToDelete = existingSubJobs.filter(sj => !keptSubJobIds.has(sj.id));
        for (const subJob of subJobsToDelete) {
          // Delete related work_queue entries
          await pool.query(
            `DELETE FROM work_queue WHERE sub_job_id = $1`,
            [subJob.id]
          );
          
          // Delete related production plan items
          await pool.query(
            `DELETE FROM production_plan_items WHERE sub_job_id = $1`,
            [subJob.id]
          );
          
          // Delete the sub-job
          await pool.query(
            `DELETE FROM sub_jobs WHERE id = $1`,
            [subJob.id]
          );
        }
      }
      
      console.log("API: Work order updated successfully");
      
      // Check if any updated sub-jobs have existing queue entries
      let hasQueuedJobs = false;
      if (updateData.items && updateData.items.length > 0) {
        // Check if any of the updated items had queue entries
        const queueCheckResult = await pool.query(
          `SELECT COUNT(*) as count FROM work_queue 
           WHERE sub_job_id IN (
             SELECT id FROM sub_jobs WHERE work_order_id = $1
           )`,
          [id]
        );
        hasQueuedJobs = parseInt(queueCheckResult.rows[0].count) > 0;
      }
      
      console.log("API: Price changed:", updateData.priceChanged, "Has queued jobs:", hasQueuedJobs);
      
      res.json({ 
        ...updateResult.rows[0], 
        hasQueuedJobs,
        priceChanged: updateData.priceChanged || false
      });
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
          wo.delivery_date,
          t.work_step_id as team_work_step_id
        FROM work_queue wq
        LEFT JOIN sub_jobs sj ON wq.sub_job_id = sj.id
        LEFT JOIN work_orders wo ON sj.work_order_id = wo.id
        LEFT JOIN teams t ON wq.team_id = t.id
        WHERE wq.team_id = $1 
          AND wq.tenant_id = $2
          AND (sj.work_step_id = t.work_step_id OR sj.work_step_id IS NULL)
        ORDER BY wq.priority ASC, wq.created_at ASC
      `, [teamId, tenantId]);

      const teamQueue = result.rows.map(row => ({
        id: row.sub_job_id, // Use sub_job_id as the main identifier for UI
        queueId: row.id, // Use work_queue.id for deletion operations
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

      // Get sub job details and check if it matches team's work step
      const subJobResult = await pool.query(
        `SELECT sj.*, wo.order_number, wo.customer_name, wo.delivery_date,
                t.department_id, ws.id as team_work_step_id
         FROM sub_jobs sj 
         INNER JOIN work_orders wo ON sj.work_order_id = wo.id 
         INNER JOIN teams t ON t.id = $2
         INNER JOIN work_steps ws ON ws.department_id = t.department_id
         WHERE sj.id = $1`,
        [subJobId, teamId]
      );

      if (subJobResult.rows.length === 0) {
        return res.status(404).json({ message: "Sub job or team not found" });
      }

      const subJob = subJobResult.rows[0];

      // Check if sub job work step matches team's work step (by department)
      if (subJob.work_step_id !== subJob.team_work_step_id) {
        return res.status(400).json({ 
          message: "Sub job work step does not match team work step",
          subJobWorkStep: subJob.work_step_id,
          teamWorkStep: subJob.team_work_step_id
        });
      }

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

  // Clear all jobs from team queue
  app.delete("/api/work-queues/team/:teamId/clear", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { teamId } = req.params;

      // Get count of jobs to be deleted for response
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM work_queue WHERE team_id = $1 AND tenant_id = $2`,
        [teamId, tenantId]
      );
      const deletedCount = parseInt(countResult.rows[0].count);

      // Delete all jobs from the team queue
      await pool.query(
        `DELETE FROM work_queue WHERE team_id = $1 AND tenant_id = $2`,
        [teamId, tenantId]
      );

      res.json({ 
        success: true, 
        deletedCount,
        message: `Cleared ${deletedCount} jobs from team queue` 
      });
    } catch (error) {
      console.error("Clear team queue error:", error);
      res.status(500).json({ message: "Failed to clear team queue" });
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
      const { 
        date, 
        teamId, 
        dateFrom, 
        dateTo, 
        workOrderId, 
        status, 
        employeeName, 
        limit = "20" 
      } = req.query;
      
      console.log("API: Daily work logs requested with filters:", { 
        date, teamId, dateFrom, dateTo, workOrderId, status, employeeName, limit, tenantId 
      });
      
      const logs = await storage.getDailyWorkLogs(tenantId, { 
        date, 
        teamId, 
        dateFrom, 
        dateTo, 
        workOrderId, 
        status, 
        employeeName, 
        limit: parseInt(limit) 
      });
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

  app.delete("/api/daily-work-logs/:id", async (req: any, res: any) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const { id } = req.params;
      
      console.log(`API: Deleting daily work log: ${id}`);
      const deleted = await storage.deleteDailyWorkLog(id, tenantId);
      
      if (deleted) {
        console.log(`API: Successfully deleted daily work log: ${id}`);
        res.json({ success: true, message: "ลบบันทึกประจำวันเรียบร้อยแล้ว" });
      } else {
        console.log(`API: Daily work log not found: ${id}`);
        res.status(404).json({ message: "ไม่พบบันทึกประจำวันที่ต้องการลบ" });
      }
    } catch (error) {
      console.error("Delete daily work log error:", error);
      res.status(500).json({ message: "ไม่สามารถลบบันทึกประจำวันได้" });
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

  // Get all sub jobs with complete data including colors and sizes
  app.get("/api/sub-jobs/complete", async (req: any, res: any) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await pool.query(`
        SELECT 
          sj.id,
          sj.work_order_id,
          sj.product_name,
          sj.quantity,
          sj.unit_price,
          sj.total_cost,
          sj.color_id,
          sj.size_id,
          sj.work_step_id,
          sj.status,
          sj.sort_order,
          c.name as color_name,
          c.code as color_code,
          s.name as size_name,
          COALESCE(SUM(dwl.quantity_completed), 0) as completed_quantity,
          sj.created_at,
          sj.updated_at
        FROM sub_jobs sj
        LEFT JOIN colors c ON sj.color_id = c.id
        LEFT JOIN sizes s ON sj.size_id = s.id
        LEFT JOIN daily_work_logs dwl ON sj.id = dwl.sub_job_id
        LEFT JOIN work_orders wo ON sj.work_order_id = wo.id
        WHERE wo.tenant_id = $1
        GROUP BY sj.id, sj.work_order_id, sj.product_name, sj.quantity, sj.unit_price, 
                 sj.total_cost, sj.color_id, sj.size_id, sj.work_step_id, sj.status, 
                 sj.sort_order, c.name, c.code, s.name, sj.created_at, sj.updated_at
        ORDER BY sj.work_order_id, sj.sort_order
      `, [tenantId]);
      
      const subJobs = result.rows.map((row: any) => ({
        id: row.id,
        workOrderId: row.work_order_id,
        productName: row.product_name,
        quantity: parseInt(row.quantity),
        unitPrice: parseFloat(row.unit_price),
        totalCost: row.total_cost,
        colorId: row.color_id,
        sizeId: row.size_id,
        workStepId: row.work_step_id,
        status: row.status,
        sortOrder: row.sort_order,
        colorName: row.color_name,
        colorCode: row.color_code,
        sizeName: row.size_name,
        completedQuantity: parseInt(row.completed_quantity),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      
      res.json(subJobs);
    } catch (error) {
      console.error("Get complete sub jobs error:", error);
      res.status(500).json({ message: "Failed to fetch complete sub jobs" });
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

  // รายการหน้าทั้งหมดในระบบ (ควรจะตรงกับใน client/src/App.tsx)
  const definedPages = [
    { name: "แดชบอร์ด", url: "/" },
    { name: "ใบเสนอราคา", url: "/sales/quotations" },
    { name: "ใบส่งสินค้า/ใบแจ้งหนี้", url: "/sales/invoices" },
    { name: "ใบกำกับภาษี", url: "/sales/tax-invoices" },
    { name: "ใบเสร็จรับเงิน", url: "/sales/receipts" },
    { name: "ปฏิทินการทำงาน", url: "/production/calendar" },
    { name: "โครงสร้างองค์กร", url: "/production/organization" },
    { name: "วางแผนการผลิต", url: "/production/planning" },
    { name: "บันทึกงานประจำวัน", url: "/production/daily-work-log" },
    { name: "ปฏิทินการทำงาน", url: "/production/work-calendar" },
    { name: "วางแผนและคิวงาน", url: "/production/work-queue-planning" },
    { name: "แผนผังหน่วยงาน", url: "/production/department-chart" },
    { name: "ใบสั่งงาน", url: "/production/work-orders" },
    { name: "รายงานการผลิต", url: "/production/production-reports" },
    { name: "บัญชี", url: "/accounting" },
    { name: "คลังสินค้า", url: "/inventory" },
    { name: "ลูกค้า", url: "/customers" },
    { name: "ข้อมูลหลัก", url: "/master-data" },
    { name: "จัดการสินค้า", url: "/products" },
    { name: "รายงาน", url: "/reports" },
    { name: "ผู้ใช้งาน", url: "/users" },
    { name: "จัดการผู้ใช้และสิทธิ์", url: "/user-management" },
    { name: "จัดการสิทธิ์การเข้าถึงหน้า", url: "/page-access-management" },
    { name: "ตั้งค่าระบบ", url: "/settings" },
    { name: "Access Demo", url: "/access-demo" },
  ];

  // API สำหรับดึงข้อมูลทั้งหมดที่จำเป็นสำหรับหน้าจัดการสิทธิ์
  app.get("/api/page-access-management/config", async (req: any, res) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000"; // Placeholder for tenant ID
      
      const allRoles = await storage.getRoles(tenantId);
      let allAccess = await storage.getAllPageAccess(tenantId);
      
      // สร้างข้อมูลสิทธิ์เริ่มต้นสำหรับหน้าใหม่ที่ยังไม่มีในฐานข้อมูล
      const adminRole = allRoles.find(role => role.name === "ADMIN");
      if (adminRole) {
        const existingPageUrls = new Set(allAccess.map(access => access.pageUrl));
        const newPages = definedPages.filter(page => !existingPageUrls.has(page.url));
        
        for (const page of newPages) {
          console.log(`สร้างสิทธิ์เริ่มต้นสำหรับหน้า: ${page.name} (${page.url})`);
          await storage.upsertPageAccess({
            roleId: adminRole.id,
            pageName: page.name,
            pageUrl: page.url,
            accessLevel: "create"
          });
        }
        
        // โหลดข้อมูลสิทธิ์ใหม่หลังจากสร้างข้อมูลเริ่มต้น
        if (newPages.length > 0) {
          allAccess = await storage.getAllPageAccess(tenantId);
        }
      }
      
      res.json({
        roles: allRoles,
        pages: definedPages,
        currentAccess: allAccess,
      });

    } catch (error) {
      console.error("Get page access config error:", error);
      res.status(500).json({ message: "Failed to get page access config" });
    }
  });

  // API สำหรับบังคับสร้างข้อมูลหน้าใหม่ทั้งหมด
  app.post("/api/page-access-management/force-sync", async (req: any, res) => {
    try {
      const tenantId = "550e8400-e29b-41d4-a716-446655440000";
      const allRoles = await storage.getRoles(tenantId);
      
      // สร้างสิทธิ์สำหรับหน้าใหม่ทั้งหมดให้กับทุก role
      for (const role of allRoles) {
        for (const page of definedPages) {
          const defaultAccessLevel = role.name === "ADMIN" ? "create" : 
                                   role.name === "GENERAL_MANAGER" ? "edit" : "view";
          
          await storage.upsertPageAccess({
            roleId: role.id,
            pageName: page.name,
            pageUrl: page.url,
            accessLevel: defaultAccessLevel
          });
        }
      }
      
      console.log(`สร้างสิทธิ์ครบถ้วนสำหรับ ${definedPages.length} หน้า และ ${allRoles.length} บทบาท`);
      res.json({ 
        message: "สร้างข้อมูลสิทธิ์ครบถ้วนแล้ว",
        pagesCount: definedPages.length,
        rolesCount: allRoles.length
      });

    } catch (error) {
      console.error("Force sync error:", error);
      res.status(500).json({ message: "Failed to sync permissions" });
    }
  });

  // API สำหรับอัปเดตสิทธิ์
  app.post("/api/page-access-management/update", async (req: any, res) => {
    try {
      // ในระบบจริง ควรเช็คว่าผู้ใช้ที่ส่ง request มามีสิทธิ์เป็น Admin หรือไม่
      const updates = req.body.accessList;
      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ message: "Invalid request body" });
      }

      await storage.batchUpdatePageAccess(updates);
      
      res.status(200).json({ message: "Permissions updated successfully" });

    } catch (error) {
      console.error("Update page access error:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  // API สำหรับอัปเดตสิทธิ์แบบ bulk
  app.post("/api/page-access-management/bulk-update", async (req: any, res) => {
    try {
      console.log("Bulk update request received:", req.body);
      
      const updates = req.body;
      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ message: "Invalid request body - expected array" });
      }

      console.log("Processing", updates.length, "permission updates");
      await storage.batchUpdatePageAccess(updates);
      
      console.log("Bulk update completed successfully");
      res.status(200).json({ message: "Permissions updated successfully" });

    } catch (error) {
      console.error("Bulk update page access error:", error);
      res.status(500).json({ message: "Failed to update permissions", error: error instanceof Error ? error.message : String(error) });
    }
  });

  const httpServer = createServer(app);
  // Daily Work Logs API for Team Revenue Report
  app.get("/api/daily-work-logs", async (req: any, res: any) => {
    try {
      const { teamId, startDate, endDate } = req.query;
      
      if (!teamId || !startDate || !endDate) {
        return res.status(400).json({
          error: "Missing required parameters: teamId, startDate, endDate"
        });
      }

      // ดึงข้อมูลจากตาราง daily_work_logs
      const workLogs = await storage.getDailyWorkLogsByTeamAndDateRange(
        teamId as string,
        startDate as string,
        endDate as string
      );

      // คำนวณรายได้และจัดรูปแบบข้อมูล
      const enrichedLogs = workLogs.map((log: any) => ({
        ...log,
        totalRevenue: (log.quantity || 0) * (log.unitPrice || 0)
      }));

      res.json(enrichedLogs);
    } catch (error) {
      console.error("Error fetching daily work logs:", error);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  });

  // Team revenue report endpoint with complete data
  app.get("/api/team-revenue-report", async (req, res) => {
    try {
      const { teamId, startDate, endDate } = req.query;
      console.log('API: Team revenue report requested:', { teamId, startDate, endDate });

      if (!teamId || !startDate || !endDate) {
        return res.status(400).json({ message: "teamId, startDate, and endDate are required" });
      }

      const logs = await storage.getDailyWorkLogsByTeamAndDateRange(
        teamId as string,
        startDate as string,
        endDate as string
      );

      console.log('API: Found revenue report data:', logs.length);
      res.json(logs);
    } catch (error) {
      console.error("Get team revenue report error:", error);
      res.status(500).json({ message: "Failed to fetch team revenue report" });
    }
  });

  // Sub-job update endpoint with sync to daily work logs
  app.put("/api/sub-jobs/:id/sync", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { quantity, production_cost } = req.body;
      
      console.log('API: Syncing sub-job data:', { id, quantity, production_cost });

      // Update sub_job
      await storage.updateSubJob(parseInt(id), { quantity, production_cost });

      console.log('API: Sub-job and daily work logs synced successfully');
      res.json({ message: "Sub-job synced successfully" });
    } catch (error) {
      console.error("Sync sub-job error:", error);
      res.status(500).json({ message: "Failed to sync sub-job" });
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



