import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { adminMiddleware } from '../../../../lib/middleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const postId = parseInt(req.query.id as string);

  if (req.method === 'DELETE') {
    try {
      // Check if post exists
      const existingPost = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          comments: true,
        },
      });

      if (!existingPost) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Delete related data first (cascade deletion)
      // Delete replies to comments on this post
      await prisma.reply.deleteMany({
        where: {
          comment: {
            postId: postId,
          },
        },
      });

      // Delete comments on this post
      await prisma.comment.deleteMany({
        where: { postId: postId },
      });

      // Delete the post
      await prisma.post.delete({
        where: { id: postId },
      });

      return res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      return res.status(500).json({ message: 'Failed to delete post' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default adminMiddleware(handler);
