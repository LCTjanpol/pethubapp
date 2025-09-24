import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt, { JwtPayload } from 'jsonwebtoken';

declare module 'next' {
  interface NextApiRequest {
    user?: { userId: number };
  }
}

// Robust authentication middleware for Next.js API routes
export function authMiddleware(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }
      const token = authHeader.split(' ')[1];
      // Use a strong secret in production!
      const secret = process.env.JWT_SECRET || 'changeme';
      const decoded = jwt.verify(token, secret) as JwtPayload & { userId: number };
      req.user = { userId: decoded.userId };
      return handler(req, res);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}

// Admin-only middleware for Next.js API routes
export function adminMiddleware(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'changeme';
      const decoded = jwt.verify(token, secret) as JwtPayload & { userId: number };
      // Fetch user from DB to check isAdmin
      const prisma = (await import('./prisma')).default;
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      req.user = { userId: decoded.userId };
      return handler(req, res);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}