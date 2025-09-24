import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { adminMiddleware } from '../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    // Return all pets in the system for admin (no user join, just raw pets)
    const pets = await prisma.pet.findMany();
    return res.status(200).json(pets);
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default adminMiddleware(handler);