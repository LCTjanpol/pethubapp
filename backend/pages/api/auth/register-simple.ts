import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { hashPassword } from '../../../lib/auth';

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
    console.log('Starting simple registration process...'); // Debug log

    const { fullName, email, password, gender, birthdate } = req.body;

    console.log('Received data:', { fullName, email, gender, birthdate }); // Debug log

    // Validate required fields
    if (!fullName || !gender || !birthdate || !email || !password) {
      console.log('Missing required fields'); // Debug log
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
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
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({ 
        where: { email: email.toLowerCase() } 
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
      console.log('User already exists:', email); // Debug log
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Hash password and create user
    let hashedPassword;
    try {
      hashedPassword = await hashPassword(password);
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
          fullName: fullName.trim(),
          gender: gender.trim(),
          birthdate: birthDate,
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          profilePicture: null,
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