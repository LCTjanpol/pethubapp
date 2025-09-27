import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { parseForm } from '../../../utils/parseForm';
import { supabase } from '../../../utils/supabaseClient';
import path from 'path';
import { promises as fsPromises } from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
    responseLimit: '10mb', // Increase response limit
  },
  maxDuration: 30, // Set max duration for Render
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
    console.log('🖼️ Starting profile image upload...');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);

    // Add timeout wrapper for Render compatibility
    const parseWithTimeout = () => {
      return Promise.race([
        parseForm(req),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FormData parsing timeout')), 25000)
        )
      ]);
    };

    // Parse multipart/form-data using utility with timeout
    const { fields, files } = await parseWithTimeout() as { fields: any, files: any };
    console.log('✅ Form parsing successful');
    console.log('Parsed fields:', Object.keys(fields));
    console.log('Parsed files:', Object.keys(files));
    console.log('Fields content:', fields);
    console.log('Files content:', Object.keys(files).map(key => ({
      key,
      filename: files[key]?.[0]?.originalFilename,
      size: files[key]?.[0]?.size
    })));

    // Extract user ID and image
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;
    const profileImage = files.profileImage?.[0] || null;

    console.log('User ID:', userId);
    console.log('Profile image received:', !!profileImage);

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    if (!profileImage) {
      return res.status(400).json({ 
        success: false,
        message: 'Profile image is required' 
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

    // Handle image upload
    let profilePicture = null;
    const file = Array.isArray(profileImage) ? profileImage[0] : profileImage;
    
    if (file && file.originalFilename) {
      try {
        const fileExtension = path.extname(file.originalFilename);
        // Use userId and email for the filename
        const safeEmail = user.email.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${user.id}_${safeEmail}${fileExtension}`;
        
        // Use buffer upload for Render compatibility
        const fileBuffer = await fsPromises.readFile(file.filepath);
        
        // Determine content type based on file extension
        let contentType = 'image/jpeg';
        if (fileExtension === '.png') contentType = 'image/png';
        else if (fileExtension === '.gif') contentType = 'image/gif';
        else if (fileExtension === '.webp') contentType = 'image/webp';
        
        // Upload to Supabase Storage
        const { error } = await supabase.storage
          .from('profile-images')
          .upload(fileName, fileBuffer, {
            contentType,
            upsert: true
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(fileName);

        profilePicture = urlData.publicUrl;
        
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
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid image file'
      });
    }

  } catch (error) {
    console.error('❌ Profile image upload error:', error);
    
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
