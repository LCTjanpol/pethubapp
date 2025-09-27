import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'Post ID is required'
    });
  }

  if (req.method === 'PUT') {
    try {
      console.log('❤️ Post like/unlike request received for ID:', id);
      
      // Authenticate user inline
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      const userId = decoded.userId;

      // Get the likes increment/decrement from request body
      const { likes } = req.body;
      if (typeof likes !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Likes value is required and must be a number'
        });
      }

      // Check database connection
      try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database connection failed',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        });
      }

      // Get current post to check if it exists
      const post = await prisma.post.findUnique({
        where: { id: parseInt(id) }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Update the post likes count
      const updatedPost = await prisma.post.update({
        where: { id: parseInt(id) },
        data: {
          likes: {
            increment: likes
          }
        },
        include: { 
          user: { select: { fullName: true, profilePicture: true, id: true } },
          comments: {
            include: {
              user: { select: { fullName: true, profilePicture: true, id: true } },
              replies: {
                include: {
                  user: { select: { fullName: true, profilePicture: true, id: true } }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      console.log('✅ Post likes updated successfully:', id, 'New count:', updatedPost.likes);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(200).json({
        success: true,
        data: updatedPost,
        message: 'Post likes updated successfully'
      });

    } catch (error) {
      console.error('❌ Post like update error:', error);
      
      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to update post likes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      console.log('🗑️ Post deletion request received for ID:', id);
      
      // Authenticate user inline
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      const userId = decoded.userId;

      // Check database connection
      try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Database connection failed',
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        });
      }

      // Check if post exists and belongs to user
      const post = await prisma.post.findUnique({
        where: { id: parseInt(id) },
        include: { user: { select: { id: true } } }
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      // Check if user owns the post
      if (post.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own posts'
        });
      }

      // Delete the post (cascade will handle comments and replies)
      await prisma.post.delete({
        where: { id: parseInt(id) }
      });

      console.log('✅ Post deleted successfully:', id);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      });

    } catch (error) {
      console.error('❌ Post deletion error:', error);
      
      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to delete post',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}