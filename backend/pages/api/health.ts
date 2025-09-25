import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      // Test database connection
      await prisma.$connect();
      
      // Get basic stats
      const userCount = await prisma.user.count();
      const petCount = await prisma.pet.count();
      const postCount = await prisma.post.count();
      
      // Simple health check response with database status
      return res.status(200).json({
        status: 'healthy',
        message: 'PetHub Backend is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: {
          connected: true,
          stats: {
            users: userCount,
            pets: petCount,
            posts: postCount
          }
        },
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error('Health check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Backend health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        database: {
          connected: false
        }
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default handler; 