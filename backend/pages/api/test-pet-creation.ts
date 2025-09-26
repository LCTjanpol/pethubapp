import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('🧪 Test Pet Creation - Starting...');
      
      // Test authentication
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      const userId = decoded.userId;
      
      console.log('🧪 Test Pet Creation - User ID:', userId);
      
      // Test database connection
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log('🧪 Test Pet Creation - User found:', user.fullName);
      
      // Test pet creation without image
      const testPet = await prisma.pet.create({
        data: {
          userId,
          name: `Test Pet ${Date.now()}`,
          age: 1,
          type: 'Dog',
          breed: 'Test Breed',
          petPicture: null
        }
      });
      
      console.log('🧪 Test Pet Creation - Pet created:', testPet.id);
      
      return res.status(201).json({
        success: true,
        message: 'Test pet created successfully',
        pet: testPet
      });
      
    } catch (error) {
      console.error('🧪 Test Pet Creation - Error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  res.json({ success: true, message: "Test route alive - POST with Authorization header to test pet creation" });
}
