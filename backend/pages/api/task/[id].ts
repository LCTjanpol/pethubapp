import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '../../../types/next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;
  const taskId = parseInt(req.query.id as string);

  if (req.method === 'PUT') {
    let { petId } = req.body;
    const { type, description, time, frequency, name } = req.body;
    
    // Validate petId
    if (typeof petId === 'string') petId = parseInt(petId, 10);
    if (typeof petId !== 'number' || isNaN(petId)) {
      return res.status(400).json({ message: 'Invalid petId' });
    }
    
    // Validate task type (allow any non-empty string, same as creation API)
    if (!type || typeof type !== 'string' || type.trim().length === 0) {
      return res.status(400).json({ message: 'Task type is required' });
    }
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Validate frequency (daily, weekly, or scheduled only)
    const allowedFrequencies = ['daily', 'weekly', 'scheduled'];
    if (!allowedFrequencies.includes(frequency)) {
      return res.status(400).json({ 
        message: `Frequency must be one of: ${allowedFrequencies.join(', ')}` 
      });
    }
    // Handle task description based on type
    let taskDescription;
    if (type === 'Feeding' || type === 'Pooping' || type === 'Drinking') {
      // Core tasks: only one per pet, description is 'Crucial'
      const existing = await prisma.task.findFirst({ where: { userId, petId, type } });
      if (existing && existing.id !== taskId) {
        return res.status(400).json({ message: `A ${type} task already exists for this pet.` });
      }
      taskDescription = 'Crucial';
    } else {
      // Custom tasks: allow multiple, use provided description or name
      taskDescription = description || name;
      if (!taskDescription) {
        return res.status(400).json({ message: 'Task description or name is required for custom tasks' });
      }
    }
    
    // Update the task
    const task = await prisma.task.update({
      where: { id: taskId, userId },
      data: { 
        petId, 
        type, 
        description: taskDescription, 
        time: new Date(time), 
        frequency 
      },
    });
    
    return res.status(200).json(task);
  }

  if (req.method === 'DELETE') {
    await prisma.task.delete({
      where: { id: taskId, userId },
    });
    return res.status(204).json({ message: 'Task deleted' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);