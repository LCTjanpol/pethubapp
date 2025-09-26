import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm } from '../../utils/parseForm';
import jwt from 'jsonwebtoken';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('🔍 Debug Pet FormData - Starting...');
      console.log('🔍 Debug Pet FormData - Headers:', req.headers);
      console.log('🔍 Debug Pet FormData - Content-Type:', req.headers['content-type']);
      
      // Test authentication
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      console.log('🔍 Debug Pet FormData - User ID:', decoded.userId);
      
      // Test FormData parsing
      console.log('🔍 Debug Pet FormData - Starting parse...');
      const { fields, files } = await parseForm(req);
      console.log('🔍 Debug Pet FormData - Parse successful');
      
      // Log all fields and files
      console.log('🔍 Debug Pet FormData - Fields:', fields);
      console.log('🔍 Debug Pet FormData - Files:', files);
      
      // Extract pet data
      const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
      const ageStr = Array.isArray(fields.age) ? fields.age[0] : fields.age;
      const type = Array.isArray(fields.type) ? fields.type[0] : fields.type;
      const breed = Array.isArray(fields.breed) ? fields.breed[0] : fields.breed;
      
      console.log('🔍 Debug Pet FormData - Extracted data:', { name, ageStr, type, breed });
      
      // Check for image file
      const file = files.petPicture?.[0] || files.image?.[0] || files.file?.[0] || null;
      console.log('🔍 Debug Pet FormData - Image file:', file ? file.originalFilename : 'No file');
      
      return res.json({ 
        success: true, 
        message: 'FormData parsing successful',
        data: {
          userId: decoded.userId,
          name,
          age: ageStr,
          type,
          breed,
          hasImage: !!file,
          imageName: file?.originalFilename || null
        }
      });
      
    } catch (error) {
      console.error('🔍 Debug Pet FormData - Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  res.json({ success: true, message: "Debug route alive - POST with FormData to test pet creation parsing" });
}
