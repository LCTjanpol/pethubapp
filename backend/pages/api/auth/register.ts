import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { hashPassword } from '../../../lib/auth';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { uploadToSupabaseStorage, STORAGE_BUCKETS } from '../../../lib/supabase-storage';

// Add type declarations for formidable
declare module 'formidable' {
  interface File {
    filepath: string;
    originalFilename: string | null;
  }
}

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

    // Check content type to determine if it's multipart form data
    const contentType = req.headers['content-type'] || '';
    let fullName: string, gender: string, birthdate: string, email: string, password: string;
    let profileImage: formidable.File | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle form data with potential file upload
      const form = formidable({ 
        multiples: true,
        keepExtensions: true,
        maxFileSize: 25 * 1024 * 1024 // 25MB limit
      });

      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
          if (err) {
            console.error('Form parsing error:', err);
            reject(err);
          }
          console.log('Parsed fields:', fields); // Debug log
          console.log('Parsed files:', files); // Debug log
          resolve([fields, files]);
        });
      });

      // Extract fields
      fullName = fields.fullName?.[0]?.trim() || '';
      gender = fields.gender?.[0]?.trim() || '';
      birthdate = fields.birthdate?.[0]?.trim() || '';
      email = fields.email?.[0]?.trim().toLowerCase() || '';
      password = fields.password?.[0] || '';
      profileImage = files.profileImage?.[0] || null;
    } else {
      // Handle JSON data (no file upload)
      const body = await new Promise<string>((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });

      const jsonData = JSON.parse(body);
      fullName = jsonData.fullName?.trim() || '';
      gender = jsonData.gender?.trim() || '';
      birthdate = jsonData.birthdate?.trim() || '';
      email = jsonData.email?.trim().toLowerCase() || '';
      password = jsonData.password || '';
    }

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email as string } 
    });
    
    if (existingUser) {
      console.log('User already exists:', email); // Debug log
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Hash password and create user (initially without profilePicture)
    const hashedPassword = await hashPassword(password as string);
    const user = await prisma.user.create({
      data: {
        fullName: fullName as string,
        gender: gender as string,
        birthdate: birthDate,
        email: email as string,
        password: hashedPassword,
        profilePicture: null, // Set later if image is uploaded
      },
    });
    console.log('User created:', user.id);

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
          
          // Read file buffer for Supabase upload
          const fileBuffer = await fs.readFile(file.filepath);
          
          // Determine content type based on file extension
          let contentType = 'image/jpeg';
          if (fileExtension === '.png') contentType = 'image/png';
          else if (fileExtension === '.gif') contentType = 'image/gif';
          else if (fileExtension === '.webp') contentType = 'image/webp';
          
          // Upload to Supabase Storage
          const uploadResult = await uploadToSupabaseStorage(
            fileBuffer,
            STORAGE_BUCKETS.PROFILE_IMAGES,
            fileName,
            contentType
          );
          
          profilePicture = uploadResult.publicUrl;
          
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

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userId: user.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}