import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { adminMiddleware } from '../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // Get user gender statistics
    const userGenderStats = await prisma.user.groupBy({
      by: ['gender'],
      _count: {
        gender: true
      }
    });

    // Get pet type statistics
    const petTypeStats = await prisma.pet.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });

    return res.status(200).json({
      userGenderStats: userGenderStats.map(stat => ({
        gender: stat.gender,
        count: stat._count.gender
      })),
      petTypeStats: petTypeStats.map(stat => ({
        type: stat.type,
        count: stat._count.type
      }))
    });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default adminMiddleware(handler);