import type { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      // Simple health check response
      return res.status(200).json({
        status: 'healthy',
        message: 'PetHub Backend is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Backend health check failed',
        error: error
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default handler; 