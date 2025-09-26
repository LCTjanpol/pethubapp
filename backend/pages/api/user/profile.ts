import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { parseForm } from '../../../utils/parseForm';
import { supabase } from '../../../utils/supabaseClient';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate user inline
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  let userId: number;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    userId = decoded.userId;
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (req.method === 'GET') {
    // Disable caching to always return 200
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          profilePicture: true,
          gender: true,
          birthdate: true,
          email: true,
        },
      });
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ message: 'Server error', error });
    }
  }

  if (req.method === 'PUT') {
    try {
      console.log('👤 Profile update request received for user:', userId);
      
      // Parse multipart/form-data using utility
      const { fields, files } = await parseForm(req);
      console.log('✅ Form parsing successful');

      // Extract fields
      const fullName = Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName;
      const gender = Array.isArray(fields.gender) ? fields.gender[0] : fields.gender;
      const birthdateRaw = Array.isArray(fields.birthdate) ? fields.birthdate[0] : fields.birthdate;

      // Only update fields that are present
      const data: Record<string, unknown> = {};
      if (fullName) data.fullName = fullName;
      if (gender) data.gender = gender;
      if (birthdateRaw) {
        const parsed = new Date(birthdateRaw);
        if (!isNaN(parsed.getTime())) data.birthdate = parsed;
      }

      // Handle profile image upload if present
      const profileImage = files.profileImage?.[0] || null;
      if (profileImage) {
        const file = Array.isArray(profileImage) ? profileImage[0] : profileImage;
        if (file && file.originalFilename) {
          try {
            console.log('📸 Processing profile image upload...');
            const fileExtension = path.extname(file.originalFilename);
            const fileName = `${userId}_profile_${Date.now()}${fileExtension}`;
            
            // Use buffer upload for Render compatibility
            const { promises: fsPromises } = await import('fs');
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

            data.profilePicture = urlData.publicUrl;
            console.log('✅ Profile image uploaded successfully');
          } catch (imgErr) {
            console.error('❌ Error uploading profile image:', imgErr);
            // Continue without image if upload fails
          }
        }
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ 
          success: false,
          message: 'No valid fields to update.' 
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          fullName: true,
          profilePicture: true,
          gender: true,
          birthdate: true,
          email: true,
        },
      });

      console.log('✅ Profile updated successfully');
      return res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('❌ Profile update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default handler;