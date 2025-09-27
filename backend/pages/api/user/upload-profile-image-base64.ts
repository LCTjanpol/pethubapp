import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
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
    console.log('🖼️ Starting base64 profile image upload...');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);

    const { userId, imageBase64 } = req.body;

    console.log('User ID:', userId);
    console.log('Image base64 length:', imageBase64 ? imageBase64.length : 0);

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ 
        success: false,
        message: 'Image data is required' 
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

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId as string) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle base64 image upload
    try {
      // Convert base64 to buffer
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate filename
      const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${user.id}_${safeEmail}.jpg`;
      
      console.log('📤 Uploading to Supabase Storage...');
      console.log('File name:', fileName);
      console.log('Buffer size:', buffer.length, 'bytes');
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('profile-images')
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
        .from('profile-images')
        .getPublicUrl(fileName);

      const profilePicture = urlData.publicUrl;
      
      console.log('✅ Supabase upload successful:', profilePicture);
      
      // Update user with the new profilePicture URL
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { profilePicture },
      });
      
      console.log('✅ User updated with profile picture:', updatedUser.profilePicture);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(200).json({
        success: true,
        message: 'Profile image uploaded successfully',
        profilePicture: updatedUser.profilePicture
      });

    } catch (imgErr) {
      console.error('❌ Error uploading profile image:', imgErr);
      
      // Disconnect from database
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to upload profile image',
        error: imgErr instanceof Error ? imgErr.message : 'Unknown upload error'
      });
    }

  } catch (error) {
    console.error('❌ Base64 profile image upload error:', error);
    
    // Ensure database disconnection on error
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('⚠️ Database disconnect error:', disconnectError);
    }
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred during image upload',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
