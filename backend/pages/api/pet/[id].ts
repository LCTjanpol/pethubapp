import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { parseForm } from '../../../utils/parseForm';
import { supabase } from '../../../utils/supabaseClient';

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const petId = parseInt(req.query.id as string);

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
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }

  if (req.method === 'PUT') {
    try {
      console.log('🐾 Pet update request received for ID:', petId);
      
      // Parse multipart/form-data using utility
      const { fields, files } = await parseForm(req);
      console.log('✅ Form parsing successful');

      // Safely extract fields as strings
      const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
      const ageStr = Array.isArray(fields.age) ? fields.age[0] : fields.age;
      const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      const breed = Array.isArray(fields.breed) ? fields.breed[0] : fields.breed;
      
      let petPicture = undefined;

      // Handle image upload if present
      const file = files.petPicture?.[0] || files.image?.[0] || files.file?.[0] || null;
      if (file) {
        try {
          console.log('📸 Processing pet image update...');
          const fileName = `pet_${userId}_${petId}_${Date.now()}.${file.originalFilename?.split('.').pop() || 'jpg'}`;
          const contentType = file.mimetype || 'image/jpeg';

          // Use buffer upload for Render compatibility
          const { promises: fsPromises } = await import('fs');
          const fileBuffer = await fsPromises.readFile(file.filepath);
          
          const { error } = await supabase.storage
            .from('pet-images')
            .upload(fileName, fileBuffer, {
              contentType,
              upsert: true
            });

          if (error) throw error;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('pet-images')
            .getPublicUrl(fileName);

          petPicture = urlData.publicUrl;
          console.log('✅ Pet image updated successfully:', petPicture);
        } catch (imgErr) {
          console.error('❌ Error updating pet image:', imgErr);
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
        where: { id: petId, userId }
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
      if (ageStr) data.age = parseInt(ageStr);
      if (type) data.type = type;
      if (breed) data.breed = breed;
      if (petPicture) data.petPicture = petPicture;

      const pet = await prisma.pet.update({
        where: { id: petId, userId },
        data,
      });

      console.log('✅ Pet updated successfully:', pet.id);

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
      console.error('❌ Pet update error:', error);
      
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

  if (req.method === 'DELETE') {
    try {
      console.log('🗑️ Pet delete request received for ID:', petId);
      
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
        where: { id: petId, userId }
      });

      if (!existingPet) {
        return res.status(404).json({
          success: false,
          message: 'Pet not found or you do not have permission to delete it'
        });
      }

      // Delete related tasks
      await prisma.task.deleteMany({ where: { petId } });
      console.log('✅ Related tasks deleted');
      
      // Delete related medical records
      await prisma.medicalRecord.deleteMany({ where: { petId } });
      console.log('✅ Related medical records deleted');
      
      // Now delete the pet
      await prisma.pet.delete({ where: { id: petId, userId } });
      console.log('✅ Pet deleted successfully:', petId);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(200).json({
        success: true,
        message: 'Pet deleted successfully'
      });
    } catch (error: unknown) {
      console.error('❌ Pet delete error:', error);
      
      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }
      
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2003'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete pet: related records exist.'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to delete pet',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method === 'GET') {
    try {
      console.log('🔍 Pet fetch request received for ID:', petId);
      
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

      const pet = await prisma.pet.findFirst({
        where: { id: petId, userId },
      });
      
      if (!pet) {
        return res.status(404).json({
          success: false,
          message: 'Pet not found'
        });
      }

      console.log('✅ Pet fetched successfully:', pet.id);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(200).json({
        success: true,
        data: pet
      });
    } catch (error) {
      console.error('❌ Pet fetch error:', error);
      
      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error fetching pet',
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