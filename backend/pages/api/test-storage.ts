import type { NextApiRequest, NextApiResponse } from 'next';
import { uploadToSupabaseStorage, STORAGE_BUCKETS } from '../../lib/supabase-storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing Supabase Storage upload from API...');
    
    // Create a test file buffer
    const testContent = Buffer.from('This is a test file uploaded from the API');
    const testFileName = `api_test_${Date.now()}.txt`;
    
    console.log('📤 Uploading test file:', testFileName);
    
    // Upload to Supabase Storage
    const result = await uploadToSupabaseStorage(
      testContent,
      STORAGE_BUCKETS.SHOP_IMAGES,
      testFileName,
      'text/plain'
    );
    
    console.log('✅ Upload result:', result);
    
    return res.status(200).json({
      success: true,
      message: 'Test file uploaded successfully',
      result
    });
    
  } catch (error) {
    console.error('❌ Test upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Test upload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
