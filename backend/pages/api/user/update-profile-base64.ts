import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { supabase } from '../../../utils/supabaseClient';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Set body size limit for base64 image
    },
  },
  maxDuration: 60, // Set max duration for Render
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'PUT') {
    try {
      console.log('👤 Profile update (Base64) request received');

      // Authenticate user inline
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      let userId: number;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
        userId = decoded.userId;
      } catch {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      const { fullName, birthdate, gender, imageBase64 } = req.body;

      if (!fullName || fullName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Full name is required'
        });
      }

      let profilePicture = null;

      if (imageBase64) {
        try {
          console.log('📸 Processing profile image update (Base64)...');
          // Remove data:image/jpeg;base64, prefix
          const base64Image = imageBase64.split(';base64,').pop();
          if (!base64Image) {
            throw new Error('Invalid base64 image format');
          }

          const buffer = Buffer.from(base64Image, 'base64');
          const fileName = `profile_${userId}_${Date.now()}.jpeg`; // Assuming JPEG

          const { error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);

          profilePicture = urlData.publicUrl;
          console.log('✅ Profile image updated successfully (Base64):', profilePicture);
        } catch (imgErr) {
          console.error('❌ Error updating profile image (Base64):', imgErr);
          // Continue without image if upload fails
        }
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
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Only update fields that are provided
      const data: Record<string, unknown> = {
        fullName: fullName.trim()
      };
      
      if (birthdate) data.birthdate = new Date(birthdate as string);
      if (gender) data.gender = gender;
      if (profilePicture) data.profilePicture = profilePicture;

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          fullName: true,
          profilePicture: true,
          gender: true,
          birthdate: true,
          email: true,
        }
      });

      console.log('✅ Profile updated successfully (Base64):', user.id);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(200).json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('❌ Profile update (Base64) error:', error);

      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
};

export default handler;

