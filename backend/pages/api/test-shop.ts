import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      console.log('🧪 Test shop endpoint - POST request received');
      console.log('📋 Request headers:', req.headers);
      console.log('📋 Content-Type:', req.headers['content-type']);
      console.log('📋 Authorization:', req.headers.authorization ? 'Present' : 'Missing');
      
      // Parse multipart/form-data for file uploads
      const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024 // 10MB limit
      });

      console.log('📤 Starting form parsing...');
      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
          if (err) {
            console.error('❌ Form parsing error:', err);
            reject(err);
          } else {
            console.log('✅ Form parsing successful');
            resolve([fields, files]);
          }
        });
      });

      console.log('📋 Form fields received:', Object.keys(fields));
      console.log('📁 Form files received:', Object.keys(files));
      console.log('📋 Form fields values:', fields);
      console.log('📁 Form files values:', files);

      return res.status(200).json({
        success: true,
        message: 'Test shop endpoint working',
        fields: Object.keys(fields),
        files: Object.keys(files),
        hasImage: Object.keys(files).length > 0
      });
      
    } catch (error) {
      console.error('❌ Test shop endpoint error:', error);
      return res.status(500).json({
        success: false,
        message: 'Test shop endpoint failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
