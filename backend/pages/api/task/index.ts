import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '../../../types/next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;

  // Allow any task type for custom tasks
  // Common types: Feeding, Pooping, Drinking, Minor, Custom, Walking, Grooming, Playing, etc.

  if (req.method === 'POST') {
    let { petId } = req.body;
    const { type, description, time, frequency, name } = req.body;
    if (typeof petId === 'string') petId = parseInt(petId, 10);
    if (typeof petId !== 'number' || isNaN(petId)) {
      return res.status(400).json({ message: 'Invalid petId' });
    }
    // Validate task type (allow any non-empty string)
    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      return res.status(400).json({ message: 'Task type is required' });
    }
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Handle custom task creation (daily and scheduled only)
    const taskDescription = description || name || 'Custom Task';
    
    // Validate frequency (daily, weekly, or scheduled only)
    const allowedFrequencies = ['daily', 'weekly', 'scheduled'];
    if (!allowedFrequencies.includes(frequency)) {
      return res.status(400).json({ 
        message: `Frequency must be one of: ${allowedFrequencies.join(', ')}` 
      });
    }
    
    // Create new custom task (allows multiple tasks per pet)
    const task = await prisma.task.create({
      data: {
        userId,
        petId,
        type,
        description: taskDescription,
        time: new Date(time),
        frequency,
      },
    });
    
    return res.status(201).json(task);
  }

  if (req.method === 'GET') {
    const petId = req.query.petId ? parseInt(req.query.petId as string) : undefined;
    const where: Record<string, unknown> = { userId };
    if (petId) where.petId = petId;
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { id: 'asc' },
    });
    return res.status(200).json(tasks);
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);