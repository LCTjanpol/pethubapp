import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;

  if (req.method === 'GET') {
    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        time: { lte: now },
      },
      include: { pet: true },
    });
    return res.status(200).json(tasks);
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler); 