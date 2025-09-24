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
      const { postId, content } = req.body;

      // Validate required fields
      if (!postId || !content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Post ID and comment content are required' });
      }

      // Verify the post exists
      const post = await prisma.post.findUnique({
        where: { id: parseInt(postId) }
      });

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Create the comment
      const comment = await prisma.comment.create({
        data: {
          userId,
          postId: parseInt(postId),
          content: content.trim()
        },
        include: {
          user: { select: { fullName: true, profilePicture: true, id: true } },
          replies: {
            include: {
              user: { select: { fullName: true, profilePicture: true, id: true } }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      return res.status(201).json(comment);
    } catch (error) {
      console.error('POST /api/comment error:', error);
      return res.status(500).json({ message: 'Failed to create comment', error });
    }
  }

  if (req.method === 'GET') {
    try {
      const { postId } = req.query;

      if (!postId) {
        return res.status(400).json({ message: 'Post ID is required' });
      }

      // Fetch comments for the specific post
      const comments = await prisma.comment.findMany({
        where: { postId: parseInt(postId as string) },
        include: {
          user: { select: { fullName: true, profilePicture: true, id: true } },
          replies: {
            include: {
              user: { select: { fullName: true, profilePicture: true, id: true } }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(comments);
    } catch (error) {
      console.error('GET /api/comment error:', error);
      return res.status(500).json({ message: 'Failed to fetch comments', error });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler); 