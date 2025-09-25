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
      console.log('🧪 Test multipart endpoint - POST request received');
      console.log('📋 Request headers:', req.headers);
      console.log('📋 Content-Type:', req.headers['content-type']);
      console.log('📋 Content-Length:', req.headers['content-length']);
      
      // Parse multipart/form-data for file uploads
      const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB limit
        maxFields: 20,
        maxFieldsSize: 2 * 1024 * 1024, // 2MB for fields
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
        message: 'Test multipart endpoint working',
        fields: Object.keys(fields),
        files: Object.keys(files),
        hasImage: Object.keys(files).length > 0,
        fieldCount: Object.keys(fields).length,
        fileCount: Object.keys(files).length
      });
      
    } catch (error) {
      console.error('❌ Test multipart endpoint error:', error);
      return res.status(500).json({
        success: false,
        message: 'Test multipart endpoint failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
