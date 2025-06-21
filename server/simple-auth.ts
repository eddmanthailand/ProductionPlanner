import session from "express-session";
import bcrypt from "bcrypt";
import type { Express } from "express";
import { storage } from "./storage";

import memorystore from 'memorystore';
const MemoryStore = memorystore(session);

export function setupSimpleAuth(app: Express) {
  // Setup session with memory store
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    }
  }));

  // Login route
  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Get user by username
      const user = await storage.getUserByUsername(username);
      console.log("User found for login:", user ? `${user.username} (active: ${user.isActive})` : "not found");
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      console.log("Checking user active status:", { username, isActive: user.isActive, type: typeof user.isActive });
      if (!user.isActive) {
        console.log("Login rejected - user account disabled:", username);
        return res.status(401).json({ message: "บัญชีผู้ใช้ถูกปิดการใช้งาน" });
      }

      // Create session
      req.session.userId = user.id;
      req.session.username = user.username;

      console.log("Session login successful for user:", username);

      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        message: "Login successful",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req: any, res) => {
    try {
      if (req.session) {
        console.log("Session logout successful");
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destruction error:", err);
            return res.status(500).json({ message: "Could not log out" });
          }
          res.clearCookie('sessionId');
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.json({ message: "No active session" });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user route
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (req.session && req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user && user.isActive) {
          const { password, ...userWithoutPassword } = user;
          console.log("Session user authenticated:", userWithoutPassword.username);
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.json(userWithoutPassword);
          return;
        } else if (user && !user.isActive) {
          // User account has been suspended - destroy session immediately
          console.log("User account suspended, destroying session:", user.username);
          req.session.destroy((err: any) => {
            if (err) console.error("Error destroying session:", err);
          });
          return res.status(401).json({ message: "บัญชีผู้ใช้ถูกระงับการใช้งาน" });
        }
      }
      res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      console.error("Auth user error:", error);
      res.status(401).json({ message: "Authentication required" });
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ message: 'Authentication required' });
  }
}