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
      console.log('🏪 Shop creation request received (base64)');
      
      // Authenticate user inline
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }

      // Verify token and get user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      const userId = decoded.userId;

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true }
      });

      if (!user || !user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const { 
        name, 
        type, 
        latitude, 
        longitude, 
        contactNumber, 
        workingHours, 
        workingDays, 
        imageBase64 
      } = req.body;

      // Validate required fields
      if (!name || !type || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Name, type, latitude, and longitude are required'
        });
      }

      console.log('📝 Shop data received:', { 
        name, 
        type, 
        latitude, 
        longitude, 
        hasImage: !!imageBase64 
      });

      let imagePath = null;

      // Handle image upload if present
      if (imageBase64) {
        try {
          console.log('📸 Processing shop image upload...');
          
          // Decode base64 to buffer
          const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique filename
          const fileName = `shop_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          
          // Upload to Supabase Storage
          const { error } = await supabase.storage
            .from('shop-images')
            .upload(fileName, imageBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (error) throw error;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('shop-images')
            .getPublicUrl(fileName);

          imagePath = urlData.publicUrl;
          console.log('✅ Shop image uploaded successfully:', imagePath);
        } catch (imgErr) {
          console.error('❌ Error uploading shop image:', imgErr);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload shop image',
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

      // Disconnect from database
      try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect warning:', disconnectError);
      }

      return res.status(201).json({
        success: true,
        data: shop,
        message: 'Shop created successfully'
      });
      
    } catch (error) {
      console.error('❌ Shop creation error:', error);
      
      // Ensure database disconnection on error
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('⚠️ Database disconnect error:', disconnectError);
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      } else if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      return res.status(500).json({ 
        success: false,
        message: 'Failed to create shop', 
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
