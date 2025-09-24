import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

/**
 * API route to serve uploaded files from the public/uploads directory
 * This ensures images are properly served with correct headers
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the file path from the URL parameters
    const { path: filePath } = req.query;
    
    if (!filePath || !Array.isArray(filePath)) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    // Join the path segments and construct the full file path
    const fileName = path.join(...filePath);
    const fullPath = path.join(process.cwd(), 'public', 'uploads', fileName);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats to determine content type
    const stats = fs.statSync(fullPath);
    const ext = path.extname(fileName).toLowerCase();

    // Set appropriate content type based on file extension
    let contentType = 'application/octet-stream';
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    // Set headers for proper file serving
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
