import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { uploadToSupabaseStorage, STORAGE_BUCKETS } from '../../../lib/supabase-storage';

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
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
      // Parse multipart/form-data
      const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024 // 5MB limit
      });
      
      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
          if (err) {
            console.error('❌ Form parsing error:', err);
            reject(err);
          } else {
            console.log('✅ Form parsing successful');
            resolve([fields, files]);
          }
        });
      });

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
      const file = files.image?.[0] || files.file?.[0] || null;
      if (file) {
        try {
          console.log('📸 Processing pet image upload...');
          const fileBuffer = await fs.readFile(file.filepath);
          const fileName = `pet_${userId}_${Date.now()}.${file.originalFilename?.split('.').pop() || 'jpg'}`;
          const contentType = file.mimetype || 'image/jpeg';

          const uploadResult = await uploadToSupabaseStorage(
            fileBuffer,
            STORAGE_BUCKETS.PET_IMAGES,
            fileName,
            contentType
          );
          
          petPicture = uploadResult.publicUrl;
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
      return res.status(201).json(pet);
      
    } catch (error) {
      console.error('❌ Pet creation error:', error);
      return res.status(500).json({ message: 'Failed to create pet', error });
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