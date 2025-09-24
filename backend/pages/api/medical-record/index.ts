import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Middleware function to verify JWT token
const authenticateToken = (req: NextApiRequest) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    return decoded.userId;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// GET /api/medical-record - Get all medical records for a specific pet
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const userId = authenticateToken(req);
      const { petId } = req.query;

      if (!petId) {
        return res.status(400).json({
          success: false,
          error: 'Pet ID is required'
        });
      }

      // Verify that the pet belongs to the user
      const pet = await prisma.pet.findFirst({
        where: {
          id: parseInt(petId as string),
          userId: userId
        }
      });

      if (!pet) {
        return res.status(404).json({
          success: false,
          error: 'Pet not found or unauthorized'
        });
      }

      // Get medical records for the pet
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: {
          petId: parseInt(petId as string),
          userId: userId
        },
        orderBy: {
          date: 'desc'
        }
      });

      return res.status(200).json({
        success: true,
        data: medicalRecords
      });

    } catch (error) {
      console.error('Medical Record Fetch Error:', error);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }

  // POST /api/medical-record - Create a new medical record
  if (req.method === 'POST') {
    try {
      const userId = authenticateToken(req);
      const { petId, diagnose, vetName, medication, description, date } = req.body;

      // Validate required fields
      if (!petId || !diagnose || !vetName || !medication || !description || !date) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required: petId, diagnose, vetName, medication, description, date'
        });
      }

      // Verify that the pet belongs to the user
      const pet = await prisma.pet.findFirst({
        where: {
          id: parseInt(petId),
          userId: userId
        }
      });

      if (!pet) {
        return res.status(404).json({
          success: false,
          error: 'Pet not found or unauthorized'
        });
      }

      // Create the medical record
      const medicalRecord = await prisma.medicalRecord.create({
        data: {
          userId: userId,
          petId: parseInt(petId),
          diagnose: diagnose,
          vetName: vetName,
          medication: medication,
          description: description,
          date: new Date(date)
        }
      });

      return res.status(201).json({
        success: true,
        data: medicalRecord
      });

    } catch (error) {
      console.error('Medical Record Creation Error:', error);
      if (error instanceof Error && error.message.includes('token')) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create medical record'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
