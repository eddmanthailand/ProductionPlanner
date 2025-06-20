import session from "express-session";
import bcrypt from "bcrypt";
import type { Express } from "express";

// In-memory user store
const users = new Map();

export async function initializeUsers() {
  // Use plain password for now to ensure login works
  users.set('admin', {
    id: 1,
    username: 'admin',
    password: 'admin123', // Plain text for debugging
    email: 'admin@company.com',
    firstName: 'Admin',
    lastName: 'User',
    roleId: 1,
    isActive: true,
    tenantId: 'default'
  });
  console.log('Initialized admin user with username: admin, password: admin123');
}

export function setupMinimalAuth(app: Express) {
  // Simple memory session
  app.use(session({
    secret: 'simple-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  // Initialize users
  initializeUsers();

  // Login route
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน" });
      }

      const user = users.get(username);
      if (!user) {
        return res.status(401).json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      }

      // Simple password comparison for now
      if (password !== user.password) {
        return res.status(401).json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "บัญชีผู้ใช้ถูกปิดการใช้งาน" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;

      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        message: "เข้าสู่ระบบสำเร็จ",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req: any, res) => {
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "ไม่สามารถออกจากระบบได้" });
        }
        res.json({ message: "ออกจากระบบสำเร็จ" });
      });
    } else {
      res.json({ message: "ไม่มีเซสชันที่ใช้งานอยู่" });
    }
  });

  // Get current user route
  app.get('/api/auth/user', (req: any, res) => {
    if (req.session && req.session.userId) {
      const user = Array.from(users.values()).find((u: any) => u.id === req.session.userId);
      if (user && user.isActive) {
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
        return;
      }
    }
    res.status(401).json({ message: "ไม่ได้รับอนุญาต" });
  });
}

// Middleware to check authentication
export function requireAuth(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'ต้องเข้าสู่ระบบก่อน' });
  }
}