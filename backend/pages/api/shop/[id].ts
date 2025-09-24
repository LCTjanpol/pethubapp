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

// Handler for updating shop details
const handler = async (req: AuthedRequest, res: NextApiResponse) => {
  if (req.method === 'PUT') {
    try {
      const shopId = parseInt(req.query.id as string);
      
      if (!shopId) {
        return res.status(400).json({ message: 'Shop ID is required' });
      }

      // Check if shop exists
      const existingShop = await prisma.shop.findUnique({
        where: { id: shopId }
      });

      if (!existingShop) {
        return res.status(404).json({ message: 'Shop not found' });
      }

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
      let imagePath = existingShop.image; // Keep existing image by default
      const imageFile = files.image;
      
      if (imageFile) {
        const fileObj = Array.isArray(imageFile) ? imageFile[0] : imageFile;
        if (fileObj && fileObj.originalFilename) {
          // Delete old image if it exists
          if (existingShop.image) {
            try {
              const oldImagePath = path.join(process.cwd(), 'public', existingShop.image);
              await fs.unlink(oldImagePath);
            } catch (error) {
              console.error('Error deleting old shop image:', error);
              // Continue with update even if old image deletion fails
            }
          }

          // Upload new image
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

      // Update shop in database
      const updatedShop = await prisma.shop.update({
        where: { id: shopId },
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

      return res.status(200).json(updatedShop);
    } catch (error) {
      console.error('Error updating shop:', error);
      return res.status(500).json({ message: 'Failed to update shop' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(adminMiddleware(handler));
