import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { uploadToSupabaseStorage, STORAGE_BUCKETS } from '../../../lib/supabase-storage';

// Debug: Check if Supabase Storage is available
console.log('🔧 Supabase Storage import check:', {
  uploadToSupabaseStorage: typeof uploadToSupabaseStorage,
  STORAGE_BUCKETS: STORAGE_BUCKETS
});

// Debug: Check environment variables
console.log('🔧 Environment variables check:', {
  SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'
});

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
      console.log('🔄 Shop update request received');
      const shopId = parseInt(req.query.id as string);
      
      if (!shopId) {
        console.log('❌ Shop ID is missing');
        return res.status(400).json({ message: 'Shop ID is required' });
      }
      
      console.log('📝 Updating shop ID:', shopId);

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
          if (err) {
            console.error('❌ Form parsing error:', err);
            reject(err);
          } else {
            console.log('✅ Form parsed successfully');
            resolve([fields, files]);
          }
        });
      });

      console.log('📋 Form fields received:', Object.keys(fields));
      console.log('📁 Form files received:', Object.keys(files));
      console.log('📋 Form fields values:', fields);
      console.log('📁 Form files values:', files);

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
      const imageFile = files.image?.[0] || null;
      
      console.log('🖼️ Image file received:', !!imageFile);
      console.log('🖼️ Current shop image:', existingShop.image);
      
      if (imageFile) {
        const fileObj = Array.isArray(imageFile) ? imageFile[0] : imageFile;
        console.log('📁 File object:', { 
          hasFile: !!fileObj, 
          hasFilename: !!fileObj?.originalFilename,
          filename: fileObj?.originalFilename 
        });
        
        if (fileObj && fileObj.originalFilename) {
          try {
            const fileExtension = path.extname(fileObj.originalFilename);
            const fileName = `shop_${shopId}_${Date.now()}${fileExtension}`;
            
            console.log('📤 Uploading image to Supabase:', fileName);
            
            // Read file buffer for Supabase upload
            const fileBuffer = await fs.readFile(fileObj.filepath);
            
            // Determine content type based on file extension
            let contentType = 'image/jpeg';
            if (fileExtension === '.png') contentType = 'image/png';
            else if (fileExtension === '.gif') contentType = 'image/gif';
            else if (fileExtension === '.webp') contentType = 'image/webp';
            
            console.log('📤 Upload details:', { fileName, contentType, bufferSize: fileBuffer.length });
            
            // Upload to Supabase Storage
            const uploadResult = await uploadToSupabaseStorage(
              fileBuffer,
              STORAGE_BUCKETS.SHOP_IMAGES,
              fileName,
              contentType
            );
            
            imagePath = uploadResult.publicUrl;
            console.log('✅ Shop image updated in Supabase:', imagePath);
          } catch (imgErr) {
            console.error('❌ Error uploading shop image:', imgErr);
            // Continue with update even if image upload fails
          }
        } else {
          console.log('⚠️ Image file object or filename missing');
        }
      } else {
        console.log('ℹ️ No image file provided, keeping existing image');
      }
      
      console.log('🖼️ Final image path to save:', imagePath);

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

// Main handler with inline authentication to avoid body consumption issues
const mainHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'PUT') {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Verify token and get user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      (req as AuthedRequest).user = { userId: decoded.userId };

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isAdmin: true }
      });

      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      return handler(req as AuthedRequest, res);
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(401).json({ message: 'Invalid token' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default mainHandler;
