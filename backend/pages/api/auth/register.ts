import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { hashPassword } from '../../../lib/auth';
import { parseForm } from '../../../utils/parseForm';
import { supabase } from '../../../utils/supabaseClient';
import path from 'path';


export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('Starting registration process...'); // Debug log
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);

    // Parse multipart/form-data using utility
    const { fields, files } = await parseForm(req);
    console.log('✅ Form parsing successful');
    console.log('Parsed fields:', Object.keys(fields));
    console.log('Parsed files:', Object.keys(files));

    // Extract fields
    const fullName = Array.isArray(fields.fullName) ? fields.fullName[0]?.trim() : fields.fullName?.trim() || '';
    const gender = Array.isArray(fields.gender) ? fields.gender[0]?.trim() : fields.gender?.trim() || '';
    const birthdate = Array.isArray(fields.birthdate) ? fields.birthdate[0]?.trim() : fields.birthdate?.trim() || '';
    const email = Array.isArray(fields.email) ? fields.email[0]?.trim().toLowerCase() : fields.email?.trim().toLowerCase() || '';
    const password = Array.isArray(fields.password) ? fields.password[0] : fields.password || '';

    // Extract profile image if present
    const profileImage = files.profileImage?.[0] || null;

    console.log('Extracted fields:', { fullName, gender, birthdate, email }); // Debug log

    // Validate required fields
    if (!fullName || !gender || !birthdate || !email || !password) {
      console.log('Missing required fields'); // Debug log
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate birthdate
    const birthDate = new Date(birthdate);
    const today = new Date();
    if (isNaN(birthDate.getTime()) || birthDate > today) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid birthdate' 
      });
    }

    // Check database connection first
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

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({ 
        where: { email: email as string } 
      });
      console.log('✅ User lookup completed');
    } catch (lookupError) {
      console.error('❌ User lookup failed:', lookupError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check existing user',
        error: lookupError instanceof Error ? lookupError.message : 'Unknown lookup error'
      });
    }
    
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Hash password and create user
    let hashedPassword;
    try {
      hashedPassword = await hashPassword(password as string);
      console.log('✅ Password hashed successfully');
    } catch (hashError) {
      console.error('❌ Password hashing failed:', hashError);
      return res.status(500).json({
        success: false,
        message: 'Password hashing failed',
        error: hashError instanceof Error ? hashError.message : 'Unknown hashing error'
      });
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          fullName: fullName as string,
          gender: gender as string,
          birthdate: birthDate,
          email: email as string,
          password: hashedPassword,
          profilePicture: null, // Set later if image is uploaded
        },
      });
      console.log('✅ User created successfully:', user.id);
    } catch (createError) {
      console.error('❌ User creation failed:', createError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: createError instanceof Error ? createError.message : 'Unknown creation error'
      });
    }

    let profilePicture = null;
    if (profileImage) {
      console.log('Profile image received:', profileImage);
      const file = Array.isArray(profileImage) ? profileImage[0] : profileImage;
      if (file && file.originalFilename) {
        try {
          const fileExtension = path.extname(file.originalFilename);
          // Use userId and email for the filename
          const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `${user.id}_${safeEmail}${fileExtension}`;
          
          // Use buffer upload (temporary fix for Render compatibility)
          const { promises: fsPromises } = await import('fs');
          const fileBuffer = await fsPromises.readFile(file.filepath);
          
          // Determine content type based on file extension
          let contentType = 'image/jpeg';
          if (fileExtension === '.png') contentType = 'image/png';
          else if (fileExtension === '.gif') contentType = 'image/gif';
          else if (fileExtension === '.webp') contentType = 'image/webp';
          
          // Upload to Supabase Storage
          const { error } = await supabase.storage
            .from('profile-images')
            .upload(fileName, fileBuffer, {
              contentType,
              upsert: true
            });

          if (error) throw error;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);

          profilePicture = urlData.publicUrl;
          
          // Update user with the new profilePicture URL
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { profilePicture },
          });
          console.log('User updated with profile picture:', updatedUser.profilePicture);
        } catch (imgErr) {
          console.error('Error saving or updating profile image:', imgErr);
          // Don't fail registration if image upload fails
          console.log('Continuing registration without profile image');
        }
      } else {
        console.error('profileImage file or originalFilename missing');
      }
    } else {
      console.log('No profile image uploaded');
    }

    // Disconnect from database
    try {
      await prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (disconnectError) {
      console.error('⚠️ Database disconnect warning:', disconnectError);
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: user.id
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Ensure database disconnection on error
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('⚠️ Database disconnect error:', disconnectError);
    }
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}