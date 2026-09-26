import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { IUser } from '../types/user';

const AUTH_SECRET = process.env.AUTH_SECRET || 'kruti-electronics-secure-jwt-key-2026';

export interface AuthRequest extends Request {
  user?: IUser;
}

export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    AUTH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): IUser | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as any;
    return {
      _id: decoded._id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      createdAt: decoded.createdAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Express middleware to protect admin routes
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.auth_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Please login to continue.' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session. Please login again.' });
  }

  req.user = user;
  next();
}
