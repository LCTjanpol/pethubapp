import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../lib/middleware';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
  },
};

interface AuthedRequest extends NextApiRequest {
  user?: { userId: number };
}

const handler = async (req: AuthedRequest, res: NextApiResponse) => {
  const userId = req.user?.userId;

  if (req.method === 'POST') {
    try {
      // Parse multipart/form-data
      const form = formidable({
        multiples: false,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024 // 5MB limit
      });
      
      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: userId missing' });
      }

      // Extract caption from form fields
      const caption = Array.isArray(fields.caption) ? fields.caption[0] : fields.caption || '';

      // Create the post first (without image)
      const post = await prisma.post.create({
        data: { 
          userId, 
          content: '', // Will be updated with image path
          caption: caption || null 
        },
        include: { 
          user: { select: { fullName: true, profilePicture: true, id: true } },
          comments: {
            include: {
              user: { select: { fullName: true, profilePicture: true, id: true } },
              replies: {
                include: {
                  user: { select: { fullName: true, profilePicture: true, id: true } }
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
      });

      // Handle image upload if present
      let imagePath = '';
      const file = files.image?.[0] || files.file?.[0] || null; // Accept both 'image' and 'file' keys
      
      if (file) {
        const fileObj = Array.isArray(file) ? file[0] : file;
        if (fileObj && fileObj.originalFilename) {
          const fileExtension = path.extname(fileObj.originalFilename);
          const fileName = `${userId}_${post.id}${fileExtension}`;
          const uploadDir = path.join(process.cwd(), 'public', 'uploads');
          await fs.mkdir(uploadDir, { recursive: true });
          const targetPath = path.join(uploadDir, fileName);
          await fs.copyFile(fileObj.filepath, targetPath);
          imagePath = `/uploads/${fileName}`;
          
          // Update post with the image path
          const updatedPost = await prisma.post.update({
            where: { id: post.id },
            data: { content: imagePath },
            include: { 
              user: { select: { fullName: true, profilePicture: true, id: true } },
              comments: {
                include: {
                  user: { select: { fullName: true, profilePicture: true, id: true } },
                  replies: {
                    include: {
                      user: { select: { fullName: true, profilePicture: true, id: true } }
                    }
                  }
                },
                orderBy: { createdAt: 'desc' }
              }
            },
          });
          return res.status(201).json(updatedPost);
        }
      }
      
      // If no image, return the original post with user info
      return res.status(201).json(post);
    } catch (error) {
      console.error('POST /api/post error:', error);
      return res.status(500).json({ message: 'Failed to create post', error });
    }
  }

  if (req.method === 'GET') {
    try {
      // Fetch posts with comments and replies included
      const posts = await prisma.post.findMany({
        include: { 
          user: { select: { fullName: true, profilePicture: true, id: true } },
          comments: {
            include: {
              user: { select: { fullName: true, profilePicture: true, id: true } },
              replies: {
                include: {
                  user: { select: { fullName: true, profilePicture: true, id: true } }
                },
                orderBy: { createdAt: 'asc' }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(posts);
    } catch (error) {
      console.error('GET /api/post error:', error);
      return res.status(500).json({ message: 'Failed to fetch posts', error });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default authMiddleware(handler);