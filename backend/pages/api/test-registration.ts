import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm } from '../../utils/parseForm';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('🧪 Test Registration - Starting...');
      console.log('🧪 Test Registration - Headers:', req.headers);
      console.log('🧪 Test Registration - Content-Type:', req.headers['content-type']);
      
      // Test FormData parsing
      const { fields, files } = await parseForm(req);
      console.log('🧪 Test Registration - Parse successful');
      console.log('🧪 Test Registration - Fields:', Object.keys(fields));
      console.log('🧪 Test Registration - Files:', Object.keys(files));
      
      // Extract fields
      const fullName = Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName;
      const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
      const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;
      
      console.log('🧪 Test Registration - Extracted data:', { fullName, email, password: password ? '***' : 'missing' });
      
      return res.json({ 
        success: true, 
        message: 'Registration test successful',
        data: {
          fullName,
          email,
          hasPassword: !!password,
          hasImage: !!files.profileImage?.[0]
        }
      });
      
    } catch (error) {
      console.error('🧪 Test Registration - Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  res.json({ success: true, message: "Test route alive - POST with FormData to test registration parsing" });
}
