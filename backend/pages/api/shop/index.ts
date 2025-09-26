import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { parseForm } from '../../../utils/parseForm';
import { supabase } from '../../../utils/supabaseClient';

export const config = {
  api: {
    bodyParser: false,
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
      
      console.log('🏪 Shops fetched from database:', shops.length, 'shops');
      console.log('🖼️ Shop images in database:', shops.map(shop => ({ id: shop.id, name: shop.name, image: shop.image })));
      
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
      console.log('🔄 Shop creation request received');
      console.log('📋 Request headers:', req.headers);
      console.log('📋 Content-Type:', req.headers['content-type']);
      
      // Parse multipart/form-data using utility
      const { fields, files } = await parseForm(req);
      console.log('✅ Form parsing successful');

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
      
      console.log('🖼️ Shop creation - Image file received:', !!imageFile);
      console.log('📁 Shop creation - Form files received:', Object.keys(files));
      console.log('📁 Shop creation - Form files values:', files);
      
      if (imageFile) {
        const fileObj = Array.isArray(imageFile) ? imageFile[0] : imageFile;
        console.log('📁 Shop creation - File object:', { 
          hasFile: !!fileObj, 
          hasFilename: !!fileObj?.originalFilename,
          filename: fileObj?.originalFilename 
        });
        
        if (fileObj && fileObj.originalFilename) {
          try {
            const fileExtension = path.extname(fileObj.originalFilename);
            const fileName = `shop_${Date.now()}${fileExtension}`;
            
            console.log('📤 Shop creation - Uploading image to Supabase:', fileName);
            
            // Determine content type based on file extension
            let contentType = 'image/jpeg';
            if (fileExtension === '.png') contentType = 'image/png';
            else if (fileExtension === '.gif') contentType = 'image/gif';
            else if (fileExtension === '.webp') contentType = 'image/webp';
            
            console.log('📤 Shop creation - Upload details:', { fileName, contentType });
            
            // Use buffer upload (temporary fix for Render compatibility)
            const { promises: fsPromises } = await import('fs');
            const fileBuffer = await fsPromises.readFile(fileObj.filepath);
            
            const { data, error } = await supabase.storage
              .from('shop-images')
              .upload(fileName, fileBuffer, {
                contentType,
                upsert: true
              });

            if (error) throw error;

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('shop-images')
              .getPublicUrl(fileName);

            imagePath = urlData.publicUrl;
            console.log('✅ Shop creation - Image uploaded to Supabase:', imagePath);
          } catch (imgErr) {
            console.error('❌ Shop creation - Error uploading shop image:', imgErr);
            // Continue without image if upload fails
          }
        } else {
          console.log('⚠️ Shop creation - Image file object or filename missing');
        }
      } else {
        console.log('ℹ️ Shop creation - No image file provided');
      }
      
      console.log('🖼️ Shop creation - Final image path to save:', imagePath);

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

          console.log('✅ Shop created successfully:', shop.id);
          return res.status(201).json(shop);
        } catch (error) {
          console.error('❌ Error creating shop:', error);
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          return res.status(500).json({ 
            message: 'Failed to create shop',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
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

      // Note: With Supabase Storage, images are automatically managed
      // No need to manually delete files as they're stored in the cloud
      console.log('Shop image will remain in Supabase Storage:', shop.image);

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

// Main handler with proper middleware application
const handler = async (req: AuthedRequest, res: NextApiResponse) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return userHandler(req, res);
  } else if (req.method === 'POST' || req.method === 'DELETE') {
    // Apply authentication middleware inline to avoid body consumption issues
    try {
      console.log('🔐 Starting authentication for shop creation...');
      const authHeader = req.headers.authorization;
      console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ No valid authorization header');
        return res.status(401).json({ message: 'No valid authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');
      console.log('🔐 Token received:', token ? 'Yes' : 'No');
      
      if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ message: 'No token provided' });
      }

      // Check if JWT_SECRET is available
      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET not found in environment variables');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      // Verify token and get user info
      console.log('🔐 Verifying JWT token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: number };
      console.log('✅ Token verified, userId:', decoded.userId);
      req.user = { userId: decoded.userId };

      // Check if user is admin
      console.log('🔐 Checking admin status...');
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isAdmin: true }
      });

      if (!user || !user.isAdmin) {
        console.log('❌ User is not admin');
        return res.status(403).json({ message: 'Admin access required' });
      }

      console.log('✅ Admin authentication successful, proceeding to shop creation...');
      return adminHandler(req, res);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ message: 'Invalid token' });
      } else if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Token expired' });
      } else {
        return res.status(500).json({ message: 'Authentication error' });
      }
    }
  }
  return res.status(405).json({ message: 'Method not allowed' });
};

export default handler;