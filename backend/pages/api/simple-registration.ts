import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { hashPassword } from '../../../lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('🧪 Simple Registration - Starting...');
      console.log('🧪 Simple Registration - Headers:', req.headers);
      console.log('🧪 Simple Registration - Content-Type:', req.headers['content-type']);
      
      // Simple JSON body parsing for testing
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          console.log('🧪 Simple Registration - Parsed data:', data);
          
          const { fullName, gender, birthdate, email, password } = data;
          
          if (!fullName || !gender || !birthdate || !email || !password) {
            return res.status(400).json({
              success: false,
              message: 'All fields are required'
            });
          }
          
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
          });
          
          if (existingUser) {
            return res.status(400).json({
              success: false,
              message: 'User already exists'
            });
          }
          
          // Hash password
          const hashedPassword = await hashPassword(password);
          
          // Create user
          const user = await prisma.user.create({
            data: {
              fullName,
              gender,
              birthdate: new Date(birthdate),
              email: email.toLowerCase(),
              password: hashedPassword,
              profilePicture: null
            }
          });
          
          console.log('🧪 Simple Registration - User created:', user.id);
          
          return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: user.id
          });
          
        } catch (parseError) {
          console.error('🧪 Simple Registration - Parse error:', parseError);
          return res.status(400).json({
            success: false,
            message: 'Invalid request data'
          });
        }
      });
      
    } catch (error) {
      console.error('🧪 Simple Registration - Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  res.json({ success: true, message: "Simple registration route alive - POST with JSON data to test registration" });
}
