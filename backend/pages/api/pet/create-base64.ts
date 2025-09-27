import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { supabase } from '../../../utils/supabaseClient';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      console.log('🐾 Pet creation request received (base64)');
      
      // Authenticate user inline
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }

      // Verify token
      jwt.verify(token, process.env.JWT_SECRET as string);

      const { name, age, type, breed, imageBase64 } = req.body;

      // Validate required fields
      if (!name || !age || !type || !breed) {
        return res.status(400).json({
          success: false,
          message: 'Missing required pet fields'
        });
      }

      console.log('📝 Pet data received:', { name, age, type, breed, hasImage: !!imageBase64 });

      let petPicture = null;

      // Handle image upload if present
      if (imageBase64) {
        try {
          console.log('📸 Processing pet image upload...');
          
          // Decode base64 to buffer
          const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const fileName = `pet_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          
          // Upload to Supabase Storage
          const { error } = await supabase.storage
            .from('pet-images')
            .upload(fileName, imageBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (error) throw error;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('pet-images')
            .getPublicUrl(fileName);

          petPicture = urlData.publicUrl;
          console.log('✅ Pet image uploaded successfully:', petPicture);
        } catch (imgErr) {
          console.error('❌ Error uploading pet image:', imgErr);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload pet image',
            error: imgErr instanceof Error ? imgErr.message : 'Unknown image error'
          });
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

      // Get user ID from token
      const decoded = jwt.decode(token) as { userId: number };
      const userId = decoded.userId;

      // Create pet
      const pet = await prisma.pet.create({
        data: { 
          userId, 
          name, 
          petPicture, 
          age: parseInt(age), 
          type, 
          breed 
        },
      });

      console.log('✅ Pet created successfully:', pet.id);

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(201).json({
        success: true,
        data: pet,
        message: 'Pet created successfully'
      });
      
    } catch (error) {
      console.error('❌ Pet creation error:', error);
      
      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }
      
      return res.status(500).json({ 
        success: false,
        message: 'Failed to create pet', 
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
