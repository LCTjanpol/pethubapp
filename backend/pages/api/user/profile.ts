import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

interface AuthedRequest extends NextApiRequest {
  user?: { userId: number };
}

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for formidable
  },
};

const handler = async (req: AuthedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;

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
    // Use formidable to parse multipart/form-data
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB limit
    });
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Only update fields that are present
    const data: Record<string, unknown> = {};
    const fullName = Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName;
    const gender = Array.isArray(fields.gender) ? fields.gender[0] : fields.gender;
    const birthdateRaw = Array.isArray(fields.birthdate) ? fields.birthdate[0] : fields.birthdate;
    let birthdate: Date | undefined = undefined;
    if (birthdateRaw) {
      const parsed = new Date(birthdateRaw);
      if (!isNaN(parsed.getTime())) birthdate = parsed;
    }
    if (fullName) data.fullName = fullName;
    if (gender) data.gender = gender;
    if (birthdate) data.birthdate = birthdate;

    // Handle profile image upload if present
    let profilePicture = undefined;
    if (files.profileImage) {
      const file = Array.isArray(files.profileImage) ? files.profileImage[0] : files.profileImage;
      if (file && file.originalFilename) {
        const fileExtension = path.extname(file.originalFilename);
        const fileName = `${userId}_profile${fileExtension}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const targetPath = path.join(uploadDir, fileName);
        await fs.copyFile(file.filepath, targetPath);
        profilePicture = `/uploads/${fileName}`;
        data.profilePicture = profilePicture;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });
    return res.status(200).json(updatedUser);
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);