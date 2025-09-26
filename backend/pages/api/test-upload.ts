import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm, config as formidableConfig } from '../../utils/parseForm';

export const config = formidableConfig;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { fields, files } = await parseForm(req);
      return res.json({ 
        success: true, 
        fields, 
        file: files?.image?.originalFilename || files?.petPicture?.originalFilename || 'No file found' 
      });
    } catch (error) {
      console.error('Test upload error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
  res.json({ success: true, msg: "Test route alive" });
}
