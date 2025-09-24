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
      where: { email: email.toLowerCase() } 
    });
    
    if (existingUser) {
      console.log('User already exists:', email); // Debug log
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        gender: gender.trim(),
        birthdate: birthDate,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        profilePicture: null,
      },
    });
    console.log('User created successfully:', user.id);

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