import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { supabase } from '../../../utils/supabaseClient';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase size limit for base64 images
    },
  },
  maxDuration: 60, // Set max duration for Render
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('📝 Base64 post creation request received');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);

    // Authenticate user
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    const userId = decoded.userId;

    const { imageBase64, caption } = req.body;

    console.log('User ID:', userId);
    console.log('Has image:', !!imageBase64);
    console.log('Caption:', caption);
    console.log('Image base64 length:', imageBase64 ? imageBase64.length : 0);

    // Validate required fields
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User ID is required' 
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

    // Handle image upload if present
    let imagePath = '';
    if (imageBase64) {
      try {
        console.log('📸 Processing post image upload...');
        
        // Convert base64 to buffer
        const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate filename
        const fileName = `post_${userId}_${Date.now()}.jpg`;
        
        console.log('📤 Uploading to Supabase Storage...');
        console.log('File name:', fileName);
        console.log('Buffer size:', buffer.length, 'bytes');
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('post-images')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
          console.error('❌ Supabase upload error:', error);
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        imagePath = urlData.publicUrl;
        console.log('✅ Post image uploaded successfully:', imagePath);
      } catch (imgErr) {
        console.error('❌ Error uploading post image:', imgErr);
        // Continue without image if upload fails
        console.log('⚠️ Continuing post creation without image');
      }
    }
    
    // Create the post with image path or caption
    const postContent = imagePath || caption || '';
    console.log('📝 Creating post with content:', postContent ? 'Has content' : 'Empty');
    
    const post = await prisma.post.create({
      data: { 
        userId, 
        content: postContent,
        caption: caption || null 
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
      },
    });

    console.log('✅ Post created successfully:', post.id);

    // Disconnect from database
    try {
      await prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (disconnectError) {
      console.error('⚠️ Database disconnect warning:', disconnectError);
    }

    return res.status(201).json({
      success: true,
      data: post,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('❌ Base64 post creation error:', error);
    
    // Ensure database disconnection on error
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('⚠️ Database disconnect error:', disconnectError);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
