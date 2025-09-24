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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: number };
    return decoded.userId;
  } catch {
    throw new Error('Invalid token');
  }
};

// GET /api/medical-record/[id] - Get a specific medical record
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || isNaN(parseInt(id as string))) {
    return res.status(400).json({
      success: false,
      error: 'Valid medical record ID is required'
    });
  }

  const medicalRecordId = parseInt(id as string);

  if (req.method === 'GET') {
    try {
      const userId = authenticateToken(req);

      const medicalRecord = await prisma.medicalRecord.findFirst({
        where: {
          id: medicalRecordId,
          userId: userId
        },
        include: {
          pet: {
            select: {
              name: true,
              type: true,
              breed: true
            }
          }
        }
      });

      if (!medicalRecord) {
        return res.status(404).json({
          success: false,
          error: 'Medical record not found or unauthorized'
        });
      }

      return res.status(200).json({
        success: true,
        data: medicalRecord
      });

    } catch (error) {
      console.error('Medical Record Fetch Error:', error);
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }

  // PUT /api/medical-record/[id] - Update a medical record
  if (req.method === 'PUT') {
    try {
      const userId = authenticateToken(req);
      const { diagnose, vetName, medication, description, date } = req.body;

      // Validate required fields
      if (!diagnose || !vetName || !medication || !description || !date) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required: diagnose, vetName, medication, description, date'
        });
      }

      // Check if medical record exists and belongs to user
      const existingRecord = await prisma.medicalRecord.findFirst({
        where: {
          id: medicalRecordId,
          userId: userId
        }
      });

      if (!existingRecord) {
        return res.status(404).json({
          success: false,
          error: 'Medical record not found or unauthorized'
        });
      }

      // Update the medical record
      const updatedRecord = await prisma.medicalRecord.update({
        where: {
          id: medicalRecordId
        },
        data: {
          diagnose: diagnose,
          vetName: vetName,
          medication: medication,
          description: description,
          date: new Date(date)
        }
      });

      return res.status(200).json({
        success: true,
        data: updatedRecord
      });

    } catch (error) {
      console.error('Medical Record Update Error:', error);
      if (error instanceof Error && error.message.includes('token')) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to update medical record'
      });
    }
  }

  // DELETE /api/medical-record/[id] - Delete a medical record
  if (req.method === 'DELETE') {
    try {
      const userId = authenticateToken(req);

      // Check if medical record exists and belongs to user
      const existingRecord = await prisma.medicalRecord.findFirst({
        where: {
          id: medicalRecordId,
          userId: userId
        }
      });

      if (!existingRecord) {
        return res.status(404).json({
          success: false,
          error: 'Medical record not found or unauthorized'
        });
      }

      // Delete the medical record
      await prisma.medicalRecord.delete({
        where: {
          id: medicalRecordId
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Medical record deleted successfully'
      });

    } catch (error) {
      console.error('Medical Record Deletion Error:', error);
      if (error instanceof Error && error.message.includes('token')) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to delete medical record'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
