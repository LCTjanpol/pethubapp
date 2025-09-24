import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;
  const postId = parseInt(req.query.id as string);

  if (req.method === 'PUT') {
    const { likes } = req.body;
    
    // Validate that likes is a number (-1 for unlike, 1 for like)
    if (typeof likes !== 'number' || (likes !== -1 && likes !== 1)) {
      return res.status(400).json({ message: 'Invalid likes value. Must be -1 or 1.' });
    }
    
    const post = await prisma.post.update({
      where: { id: postId },
      data: { likes: { increment: likes } },
    });
    return res.status(200).json(post);
  }

  if (req.method === 'DELETE') {
    try {
      // First check if the post exists and belongs to the user
      const existingPost = await prisma.post.findFirst({
        where: { id: postId, userId },
      });

      if (!existingPost) {
        return res.status(404).json({ 
          success: false, 
          message: 'Post not found or you do not have permission to delete it' 
        });
      }

      // Delete the post and all related data (comments, replies)
      await prisma.post.delete({
        where: { id: postId, userId },
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Post deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete post' 
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);