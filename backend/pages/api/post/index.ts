import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { uploadToSupabaseStorage, STORAGE_BUCKETS } from '../../../lib/supabase-storage';

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser
  },
};

// Removed unused interface

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      console.log('📝 Post creation request received');
      
      // Authenticate user inline to avoid middleware interference
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      const userId = decoded.userId;

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
          try {
            const fileExtension = path.extname(fileObj.originalFilename);
            const fileName = `${userId}_${post.id}${fileExtension}`;
            
            // Read file buffer for Supabase upload
            const fileBuffer = await fs.readFile(fileObj.filepath);
            
            // Determine content type based on file extension
            let contentType = 'image/jpeg';
            if (fileExtension === '.png') contentType = 'image/png';
            else if (fileExtension === '.gif') contentType = 'image/gif';
            else if (fileExtension === '.webp') contentType = 'image/webp';
            
            // Upload to Supabase Storage
            const uploadResult = await uploadToSupabaseStorage(
              fileBuffer,
              STORAGE_BUCKETS.POST_IMAGES,
              fileName,
              contentType
            );
            
            imagePath = uploadResult.publicUrl;
            
            // Update post with the image URL
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
          } catch (imgErr) {
            console.error('Error uploading post image:', imgErr);
            // Continue without image if upload fails
          }
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
      // Authenticate user inline
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
      // const userId = decoded.userId; // Not used in GET method

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

export default handler;