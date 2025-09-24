import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';

interface AuthedRequest extends NextApiRequest {
  user?: { userId: number };
}

const handler = async (req: AuthedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: userId missing' });
  }

  if (req.method === 'POST') {
    try {
      const { commentId, content } = req.body;

      // Validate required fields
      if (!commentId || !content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Comment ID and reply content are required' });
      }

      // Verify the comment exists
      const comment = await prisma.comment.findUnique({
        where: { id: parseInt(commentId) }
      });

      if (!comment) {
        return res.status(404).json({ message: 'Comment not found' });
      }

      // Create the reply
      const reply = await prisma.reply.create({
        data: {
          userId,
          commentId: parseInt(commentId),
          content: content.trim()
        },
        include: {
          user: { select: { fullName: true, profilePicture: true, id: true } }
        }
      });

      return res.status(201).json(reply);
    } catch (error) {
      console.error('POST /api/reply error:', error);
      return res.status(500).json({ message: 'Failed to create reply', error });
    }
  }

  if (req.method === 'GET') {
    try {
      const { commentId } = req.query;

      if (!commentId) {
        return res.status(400).json({ message: 'Comment ID is required' });
      }

      // Fetch replies for the specific comment
      const replies = await prisma.reply.findMany({
        where: { commentId: parseInt(commentId as string) },
        include: {
          user: { select: { fullName: true, profilePicture: true, id: true } }
        },
        orderBy: { createdAt: 'asc' }
      });

      return res.status(200).json(replies);
    } catch (error) {
      console.error('GET /api/reply error:', error);
      return res.status(500).json({ message: 'Failed to fetch replies', error });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler); 