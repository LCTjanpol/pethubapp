import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware, adminMiddleware } from '../../../lib/middleware';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

interface AuthedRequest extends NextApiRequest {
  user?: { userId: number };
}

// Handler for regular users to fetch shop locations
const userHandler = async (req: AuthedRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const shops = await prisma.shop.findMany({
        select: { 
          id: true, 
          name: true, 
          latitude: true, 
          longitude: true, 
          type: true,
          contactNumber: true,
          workingHours: true,
          workingDays: true,
          image: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(shops);
    } catch (error) {
      console.error('Error fetching shops:', error);
      return res.status(500).json({ message: 'Failed to fetch shops' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

// Handler for admin to add new shops with image upload
const adminHandler = async (req: AuthedRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      // Parse multipart/form-data for file uploads
      const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024 // 10MB limit
      });

      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      // Extract form data
      const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
      const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      const latitude = Array.isArray(fields.latitude) ? fields.latitude[0] : fields.latitude;
      const longitude = Array.isArray(fields.longitude) ? fields.longitude[0] : fields.longitude;
      const contactNumber = Array.isArray(fields.contactNumber) ? fields.contactNumber[0] : fields.contactNumber;
      const workingHours = Array.isArray(fields.workingHours) ? fields.workingHours[0] : fields.workingHours;
      const workingDays = Array.isArray(fields.workingDays) ? fields.workingDays[0] : fields.workingDays;

      // Validate required fields
      if (!name || !type || !latitude || !longitude) {
        return res.status(400).json({ message: 'Name, type, latitude, and longitude are required' });
      }

      // Handle image upload if present
      let imagePath = null;
      const imageFile = files.image?.[0] || null;
      
      if (imageFile) {
        const fileObj = Array.isArray(imageFile) ? imageFile[0] : imageFile;
        if (fileObj && fileObj.originalFilename) {
          const fileExtension = path.extname(fileObj.originalFilename);
          const fileName = `shop_${Date.now()}${fileExtension}`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'shops');
          
          // Ensure upload directory exists
          await fs.mkdir(uploadDir, { recursive: true });
          
          const targetPath = path.join(uploadDir, fileName);
          await fs.copyFile(fileObj.filepath, targetPath);
          imagePath = `/uploads/shops/${fileName}`;
        }
      }

      // Create shop in database
      const shop = await prisma.shop.create({
        data: {
          name: name as string,
          type: type as string,
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
          contactNumber: contactNumber as string || null,
          workingHours: workingHours as string || null,
          workingDays: workingDays as string || null,
          image: imagePath
        },
      });

      return res.status(201).json(shop);
    } catch (error) {
      console.error('Error creating shop:', error);
      return res.status(500).json({ message: 'Failed to create shop' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'Shop ID is required' });
      }

      // Find shop to get image path for deletion
      const shop = await prisma.shop.findUnique({
        where: { id: parseInt(id as string) }
      });

      if (!shop) {
        return res.status(404).json({ message: 'Shop not found' });
      }

      // Delete image file if exists
      if (shop.image) {
        try {
          const imagePath = path.join(process.cwd(), 'public', shop.image);
          await fs.unlink(imagePath);
        } catch (error) {
          console.error('Error deleting shop image:', error);
          // Continue with shop deletion even if image deletion fails
        }
      }

      // Delete shop from database
      await prisma.shop.delete({
        where: { id: parseInt(id as string) }
      });

      return res.status(200).json({ message: 'Shop deleted successfully' });
    } catch (error) {
      console.error('Error deleting shop:', error);
      return res.status(500).json({ message: 'Failed to delete shop' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

// Combine handlers based on request method
const handler = async (req: AuthedRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    return userHandler(req, res);
  } else if (req.method === 'POST' || req.method === 'DELETE') {
    return adminMiddleware(adminHandler)(req, res);
  }
  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);