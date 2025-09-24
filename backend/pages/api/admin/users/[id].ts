import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { adminMiddleware } from '../../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const userId = parseInt(req.query.id as string);

  if (req.method === 'DELETE') {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent admin from deleting themselves
      if (user.isAdmin) {
        return res.status(400).json({ message: 'Cannot delete admin users' });
      }

      // Delete related data first (cascade deletion)
      await prisma.reply.deleteMany({ where: { userId } });
      await prisma.comment.deleteMany({ where: { userId } });
      await prisma.post.deleteMany({ where: { userId } });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.medicalRecord.deleteMany({ where: { userId } });
      await prisma.pet.deleteMany({ where: { userId } });

      // Finally delete the user
      await prisma.user.delete({
        where: { id: userId }
      });

      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Failed to delete user' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default adminMiddleware(handler); 