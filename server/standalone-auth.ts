import express from 'express';
import session from 'express-session';
import createMemoryStore from 'memorystore';

// Memory session store
const MemoryStore = createMemoryStore(session);

// In-memory user store - completely isolated from database
const users = new Map();

export function initializeStandaloneAuth() {
  // Create admin user
  users.set('admin', {
    id: 1,
    username: 'admin',
    password: 'admin123',
    email: 'admin@company.com',
    firstName: 'Admin',
    lastName: 'User',
    roleId: 1,
    isActive: true,
    tenantId: 'default'
  });
  console.log('Standalone auth initialized - admin user ready');
}

export function setupStandaloneAuth(app: express.Express) {
  // Session configuration with memory store only
  app.use(session({
    secret: 'standalone-session-secret-key-12345',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Initialize users
  initializeStandaloneAuth();

  // Login route
  app.post('/api/auth/login', (req: any, res) => {
    console.log("=== LOGIN ATTEMPT ===");
    console.log("Request body:", req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log("Missing credentials");
      return res.status(400).json({ message: "กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน" });
    }

    console.log("Looking for user:", username);
    console.log("Available users:", Array.from(users.keys()));
    
    const user = users.get(username);
    if (!user) {
      console.log("User not found");
      return res.status(401).json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    console.log("Found user, checking password");
    console.log("Provided:", password);
    console.log("Expected:", user.password);
    
    if (password !== user.password) {
      console.log("Password mismatch");
      return res.status(401).json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    if (!user.isActive) {
      console.log("User inactive");
      return res.status(401).json({ message: "บัญชีผู้ใช้ถูกปิดการใช้งาน" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.user = user;

    console.log("Login successful, session created");
    console.log("Session ID:", req.session.id);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      message: "เข้าสู่ระบบสำเร็จ",
      user: userWithoutPassword
    });
  });

  // Get current user route
  app.get('/api/auth/user', (req: any, res) => {
    console.log("=== USER CHECK ===");
    console.log("Session ID:", req.session?.id);
    console.log("User ID:", req.session?.userId);
    
    if (!req.session.userId) {
      console.log("No session found");
      return res.status(401).json({ message: "ไม่ได้รับอนุญาต" });
    }

    const user = users.get(req.session.username);
    if (!user) {
      console.log("User not found in store");
      return res.status(401).json({ message: "ไม่ได้รับอนุญาต" });
    }

    console.log("User authenticated:", user.username);
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Logout route
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการออกจากระบบ" });
      }
      res.json({ message: "ออกจากระบบสำเร็จ" });
    });
  });

  console.log("Standalone authentication system ready");
}

export function requireStandaloneAuth(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "ไม่ได้รับอนุญาต" });
  }
  next();
}