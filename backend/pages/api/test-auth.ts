import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      console.log('🧪 Test auth endpoint - POST request received');
      console.log('📋 Request headers:', req.headers);
      console.log('📋 Authorization:', req.headers.authorization ? 'Present' : 'Missing');
      
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No valid authorization header');
        return res.status(401).json({ 
          success: false,
          message: 'No valid authorization header' 
        });
      }

      const token = authHeader.replace('Bearer ', '');
      console.log('🔐 Token received:', token ? 'Yes' : 'No');
      
      if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }

      // Check if JWT_SECRET is available
      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET not found in environment variables');
        return res.status(500).json({ 
          success: false,
          message: 'Server configuration error' 
        });
      }

      // Verify token and get user info
      console.log('🔐 Verifying JWT token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
      console.log('✅ Token verified, userId:', decoded.userId);

      return res.status(200).json({
        success: true,
        message: 'Authentication test successful',
        userId: decoded.userId
      });
      
    } catch (error) {
      console.error('❌ Test auth endpoint error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token' 
        });
      } else if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          message: 'Token expired' 
        });
      } else {
        return res.status(500).json({ 
          success: false,
          message: 'Authentication error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
