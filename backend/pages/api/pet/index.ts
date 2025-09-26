import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { parseForm } from '../../../utils/parseForm';
import { supabase } from '../../../utils/supabaseClient';

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

  if (req.method === 'POST') {
    try {
      console.log('🐾 Pet creation request received');
      
      // Authenticate user inline to avoid middleware interference
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      const userId = decoded.userId;
      // Parse multipart/form-data using utility
      const { fields, files } = await parseForm(req);
      console.log('✅ Form parsing successful');

      // Safely extract fields as strings
      const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
      const ageStr = Array.isArray(fields.age) ? fields.age[0] : fields.age;
      const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      const breed = Array.isArray(fields.breed) ? fields.breed[0] : fields.breed;
      
      if (!name || !ageStr || !type || !breed) {
        return res.status(400).json({ message: 'Missing required pet fields' });
      }
      
      const age = parseInt(ageStr);
      let petPicture = null;

      // Handle image upload if present
      const file = files.petPicture?.[0] || files.image?.[0] || files.file?.[0] || null;
      if (file) {
        try {
          console.log('📸 Processing pet image upload...');
          const fileName = `pet_${userId}_${Date.now()}.${file.originalFilename?.split('.').pop() || 'jpg'}`;
          const contentType = file.mimetype || 'image/jpeg';

          // Use buffer upload (temporary fix for Render compatibility)
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
          console.log('✅ Pet image uploaded successfully:', petPicture);
        } catch (imgErr) {
          console.error('❌ Error uploading pet image:', imgErr);
          // Continue without image if upload fails
        }
      }

      // Create pet with image
      const pet = await prisma.pet.create({
        data: { userId, name, petPicture, age, type, breed },
      });

      console.log('✅ Pet created successfully:', pet.id);
      return res.status(201).json({
        success: true,
        data: pet,
        message: 'Pet created successfully'
      });
      
    } catch (error) {
      console.error('❌ Pet creation error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Failed to create pet', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method === 'GET') {
    try {
      // Authenticate user inline
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      const userId = decoded.userId;

      // Check if user is admin
      const user = await prisma.user.findUnique({ where: { id: userId } });
      let pets;
      if (user && user.isAdmin) {
        pets = await prisma.pet.findMany();
      } else {
        pets = await prisma.pet.findMany({ where: { userId } });
      }
      return res.status(200).json(pets);
    } catch (error) {
      console.error('❌ Pet fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch pets', error });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default handler;