import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { adminMiddleware } from '../../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const petId = parseInt(req.query.id as string);

  if (req.method === 'DELETE') {
    try {
      // Check if pet exists
      const pet = await prisma.pet.findUnique({
        where: { id: petId }
      });

      if (!pet) {
        return res.status(404).json({ message: 'Pet not found' });
      }

      // Delete related data first (cascade deletion)
      await prisma.task.deleteMany({ where: { petId } });
      await prisma.medicalRecord.deleteMany({ where: { petId } });

      // Delete the pet
      await prisma.pet.delete({
        where: { id: petId }
      });

      return res.status(200).json({ message: 'Pet deleted successfully' });
    } catch (error) {
      console.error('Error deleting pet:', error);
      return res.status(500).json({ message: 'Failed to delete pet' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default adminMiddleware(handler); 