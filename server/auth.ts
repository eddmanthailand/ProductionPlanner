import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    teamId?: string;
    tenantId: string;
  };
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      teamId: user.teamId,
      tenantId: user.tenantId
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verify JWT token middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'ต้องการ token การเข้าสู่ระบบ' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    req.user = user;
    next();
  });
}

// Role-based access control middleware
export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'ไม่ได้เข้าสู่ระบบ' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    next();
  };
}

// Team access control middleware
export function requireTeamAccess(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'ไม่ได้เข้าสู่ระบบ' });
  }

  // Admin can access all teams
  if (req.user.role === 'admin') {
    return next();
  }

  const requestedTeamId = req.params.teamId || req.body.teamId || req.query.teamId;
  
  // Manager can access all teams
  if (req.user.role === 'manager') {
    return next();
  }

  // Regular user can only access their own team
  if (req.user.teamId !== requestedTeamId) {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลของทีมนี้' });
  }

  next();
}