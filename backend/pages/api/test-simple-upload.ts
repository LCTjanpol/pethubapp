import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm } from '../../utils/parseForm';
import { supabase } from '../../utils/supabaseClient';
import { promises as fs } from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('🧪 Test Simple Upload - Starting...');
      const { fields, files } = await parseForm(req);
      
      const file = files.image?.[0] || files.petPicture?.[0] || null;
      if (!file) {
        return res.json({ success: false, message: 'No file found' });
      }
      
      console.log('🧪 Test Simple Upload - File found:', file.originalFilename);
      
      // Test with buffer approach (not streaming)
      const fileBuffer = await fs.readFile(file.filepath);
      const fileName = `test_${Date.now()}.${file.originalFilename?.split('.').pop() || 'jpg'}`;
      
      console.log('🧪 Test Simple Upload - Uploading to Supabase...');
      
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, fileBuffer, {
          contentType: file.mimetype || 'image/jpeg',
          upsert: true
        });

      if (error) {
        console.error('🧪 Test Simple Upload - Supabase error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      const { data: urlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      console.log('🧪 Test Simple Upload - Success!');
      
      return res.json({ 
        success: true, 
        fileName,
        publicUrl: urlData.publicUrl,
        message: 'Upload successful'
      });
      
    } catch (error) {
      console.error('🧪 Test Simple Upload - Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  res.json({ success: true, message: "Test route alive - POST with FormData to test upload" });
}
