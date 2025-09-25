import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      console.log('🧪 Simple test endpoint - POST request received');
      console.log('📋 Request headers:', req.headers);
      console.log('📋 Content-Type:', req.headers['content-type']);
      console.log('📋 Content-Length:', req.headers['content-length']);
      
      return res.status(200).json({
        success: true,
        message: 'Simple test endpoint working',
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length']
      });
      
    } catch (error) {
      console.error('❌ Simple test endpoint error:', error);
      return res.status(500).json({
        success: false,
        message: 'Simple test endpoint failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
