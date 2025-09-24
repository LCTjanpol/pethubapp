import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';
import type { AuthenticatedRequest } from '../../../types/next';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;
  const recordId = parseInt(req.query.id as string);

  if (req.method === 'PUT') {
    const { petId, diagnose, vetName, medication, description, date } = req.body;
    const record = await prisma.medicalRecord.update({
      where: { id: recordId, userId },
      data: {
        petId,
        diagnose,
        vetName,
        medication,
        description,
        date: new Date(date),
      },
    });
    return res.status(200).json(record);
  }

  if (req.method === 'DELETE') {
    await prisma.medicalRecord.delete({
      where: { id: recordId, userId },
    });
    return res.status(204).json({ message: 'Medical record deleted' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);