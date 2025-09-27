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
      console.log('🐾 Pet update (Base64) request received');

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

      const { id, name, age, type, breed, imageBase64 } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Pet ID is required for update'
        });
      }

      let petPicture = null;

      if (imageBase64) {
        try {
          console.log('📸 Processing pet image update (Base64)...');
          // Remove data:image/jpeg;base64, prefix
          const base64Image = imageBase64.split(';base64,').pop();
          if (!base64Image) {
            throw new Error('Invalid base64 image format');
          }

          const buffer = Buffer.from(base64Image, 'base64');
          const fileName = `pet_${userId}_${id}_${Date.now()}.jpeg`; // Assuming JPEG

          const { error: uploadError } = await supabase.storage
            .from('pet-images')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('pet-images')
            .getPublicUrl(fileName);

          petPicture = urlData.publicUrl;
          console.log('✅ Pet image updated successfully (Base64):', petPicture);
        } catch (imgErr) {
          console.error('❌ Error updating pet image (Base64):', imgErr);
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

      // Check if pet exists and belongs to user
      const existingPet = await prisma.pet.findFirst({
        where: { id: parseInt(id as string), userId }
      });

      if (!existingPet) {
        return res.status(404).json({
          success: false,
          message: 'Pet not found or you do not have permission to edit it'
        });
      }

      // Only update fields that are provided
      const data: Record<string, unknown> = {};
      if (name) data.name = name;
      if (age) data.age = parseInt(age as string);
      if (type) data.type = type;
      if (breed) data.breed = breed;
      if (petPicture) data.petPicture = petPicture;

      const pet = await prisma.pet.update({
        where: { id: parseInt(id as string), userId },
        data,
      });

      console.log('✅ Pet updated successfully (Base64):', pet.id);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(200).json({
        success: true,
        data: pet,
        message: 'Pet updated successfully'
      });

    } catch (error) {
      console.error('❌ Pet update (Base64) error:', error);

      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update pet',
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

