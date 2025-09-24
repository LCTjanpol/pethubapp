import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { adminMiddleware } from '../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, gender: true, birthdate: true, email: true, isAdmin: true },
    });
    return res.status(200).json(users);
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default adminMiddleware(handler);