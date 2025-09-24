import type { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';
import type { AuthenticatedRequest } from '../../../types/next';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;
  const petId = parseInt(req.query.id as string);

  if (req.method === 'PUT') {
    // Parse multipart/form-data
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
    });
    // Fix: Add type annotation for Promise and destructure result
    const result = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });
    const [fields, files] = result;
    // Safely extract fields as strings
    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const ageStr = Array.isArray(fields.age) ? fields.age[0] : fields.age;
    const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
    const breed = Array.isArray(fields.breed) ? fields.breed[0] : fields.breed;
    let petPicture = undefined;
    if (files.petPicture) {
      const file = Array.isArray(files.petPicture) ? files.petPicture[0] : files.petPicture;
      if (file && file.originalFilename) {
        const fileExtension = path.extname(file.originalFilename);
        const fileName = `${userId}_${petId}${fileExtension}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const targetPath = path.join(uploadDir, fileName);
        await fs.copyFile(file.filepath, targetPath);
        petPicture = `/uploads/${fileName}`;
      }
    }
    // Only update fields that are provided
    // Fix: Use Record<string, unknown> instead of any
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
    return res.status(200).json(pet);
  }

  if (req.method === 'DELETE') {
    try {
      // Delete related tasks
      await prisma.task.deleteMany({ where: { petId } });
      // Delete related medical records
      await prisma.medicalRecord.deleteMany({ where: { petId } });
      // Now delete the pet
      await prisma.pet.delete({ where: { id: petId, userId } });
      return res.status(204).json({ message: 'Pet deleted' });
    } catch (error: unknown) {
      console.error('Error deleting pet:', error);
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2003'
      ) {
        return res.status(400).json({ message: 'Cannot delete pet: related records exist.' });
      }
      return res.status(500).json({ message: 'Failed to delete pet', error });
    }
  }

  if (req.method === 'GET') {
    try {
      const pet = await prisma.pet.findFirst({
        where: { id: petId, userId },
      });
      if (!pet) {
        return res.status(404).json({ message: 'Pet not found' });
      }
      return res.status(200).json(pet);
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching pet', error });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);