import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';
import type { AuthenticatedRequest } from '../../../types/next';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;

  if (req.method === 'POST') {
    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { petId, diagnose, vetName, medication, description, date } = req.body;
    const record = await prisma.medicalRecord.create({
      data: {
        userId,
        petId,
        diagnose,
        vetName,
        medication,
        description,
        date: new Date(date),
      },
    });
    return res.status(201).json(record);
  }

  if (req.method === 'GET') {
    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const records = await prisma.medicalRecord.findMany({
      where: { userId },
    });
    return res.status(200).json(records);
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);