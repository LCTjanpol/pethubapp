import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;

  if (req.method === 'POST') {
    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Parse multipart/form-data
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024 // 5MB limit
    });
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
        if (err) reject(err);
        else resolve([fields, files]);
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

    // Create pet first (without image)
    const pet = await prisma.pet.create({
      data: { userId, name, petPicture: null, age, type, breed },
    });

    // Handle pet image if uploaded
    if (files.petPicture) {
      const file = Array.isArray(files.petPicture) ? files.petPicture[0] : files.petPicture;
      if (file && file.originalFilename) {
        const fileExtension = path.extname(file.originalFilename);
        const fileName = `${userId}_${pet.id}${fileExtension}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const targetPath = path.join(uploadDir, fileName);
        await fs.copyFile(file.filepath, targetPath);
        const petPicture = `/uploads/${fileName}`;
        // Update pet with the new petPicture path
        await prisma.pet.update({
          where: { id: pet.id },
          data: { petPicture },
        });
        pet.petPicture = petPicture;
      }
    }
    return res.status(201).json(pet);
  }

  if (req.method === 'GET') {
    // If admin, return all pets; if user, return only their pets
    let pets;
    if (req.user && req.user.isAdmin) {
      pets = await prisma.pet.findMany();
    } else if (userId) {
      pets = await prisma.pet.findMany({ where: { userId } });
    } else {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(200).json(pets);
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);