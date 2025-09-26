import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm } from '../../utils/parseForm';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔍 Debug FormData - Method:', req.method);
  console.log('🔍 Debug FormData - Headers:', req.headers);
  console.log('🔍 Debug FormData - Content-Type:', req.headers['content-type']);
  
  if (req.method === 'POST') {
    try {
      console.log('🔍 Debug FormData - Starting parse...');
      const { fields, files } = await parseForm(req);
      console.log('🔍 Debug FormData - Parse successful');
      console.log('🔍 Debug FormData - Fields:', Object.keys(fields));
      console.log('🔍 Debug FormData - Files:', Object.keys(files));
      
      return res.json({ 
        success: true, 
        fields: Object.keys(fields),
        files: Object.keys(files),
        message: 'FormData parsing successful'
      });
    } catch (error) {
      console.error('🔍 Debug FormData - Parse error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'FormData parsing failed'
      });
    }
  }
  
  res.json({ success: true, message: "Debug route alive - POST to test FormData" });
}
