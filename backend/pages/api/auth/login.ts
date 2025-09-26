import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { comparePassword, generateToken } from '../../../lib/auth';

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
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
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

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      });
    }

    // Find user by email
    let user;
    try {
      user = await prisma.user.findUnique({ 
        where: { email: email.toLowerCase() } 
      });
      console.log('✅ User lookup completed');
    } catch (lookupError) {
      console.error('❌ User lookup failed:', lookupError);
      return res.status(500).json({
        success: false,
        message: 'Failed to find user',
        error: lookupError instanceof Error ? lookupError.message : 'Unknown lookup error'
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Verify password
    let isPasswordValid;
    try {
      isPasswordValid = await comparePassword(password, user.password);
      console.log('✅ Password verification completed');
    } catch (passwordError) {
      console.error('❌ Password verification failed:', passwordError);
      return res.status(500).json({
        success: false,
        message: 'Password verification failed',
        error: passwordError instanceof Error ? passwordError.message : 'Unknown password error'
      });
    }

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    let token;
    try {
      token = generateToken(user.id, user.isAdmin);
      console.log('✅ Token generated successfully');
    } catch (tokenError) {
      console.error('❌ Token generation failed:', tokenError);
      return res.status(500).json({
        success: false,
        message: 'Token generation failed',
        error: tokenError instanceof Error ? tokenError.message : 'Unknown token error'
      });
    }

    // Disconnect from database
    try {
      await prisma.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (disconnectError) {
      console.error('⚠️ Database disconnect warning:', disconnectError);
    }

    // Return success response
    return res.status(200).json({ 
      success: true,
      message: 'Login successful',
      token, 
      isAdmin: user.isAdmin,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Ensure database disconnection on error
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('⚠️ Database disconnect error:', disconnectError);
    }
    
    return res.status(500).json({ 
      success: false,
      message: 'An error occurred during login. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}