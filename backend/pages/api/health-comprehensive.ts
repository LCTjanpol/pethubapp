import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🔍 Starting comprehensive health check...');
    
    // Test database connection
    const dbStart = Date.now();
    const userCount = await prisma.user.count();
    const petCount = await prisma.pet.count();
    const postCount = await prisma.post.count();
    const shopCount = await prisma.shop.count();
    const dbTime = Date.now() - dbStart;

    // Test environment variables
    const envCheck = {
      JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Set' : '❌ Missing',
    };

    // Test Supabase Storage
    let storageCheck = '❌ Not tested';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Test storage access
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        storageCheck = `❌ Error: ${error.message}`;
      } else {
        const bucketNames = buckets?.map(b => b.name) || [];
        storageCheck = `✅ Accessible (${bucketNames.length} buckets: ${bucketNames.join(', ')})`;
      }
    } catch (error) {
      storageCheck = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        responseTime: `${dbTime}ms`,
        stats: {
          users: userCount,
          pets: petCount,
          posts: postCount,
          shops: shopCount,
        }
      },
      environmentVariables: envCheck,
      storage: {
        status: storageCheck
      },
      apiRoutes: {
        auth: {
          login: '/api/auth/login',
          register: '/api/auth/register',
          registerSimple: '/api/auth/register-simple'
        },
        user: {
          profile: '/api/user/profile'
        },
        posts: {
          list: '/api/post',
          detail: '/api/post/[id]'
        },
        pets: {
          list: '/api/pet',
          detail: '/api/pet/[id]'
        },
        shops: {
          list: '/api/shop',
          detail: '/api/shop/[id]'
        },
        admin: {
          users: '/api/admin/users',
          pets: '/api/admin/pets',
          stats: '/api/admin/stats'
        },
        medical: {
          records: '/api/medical-record',
          vaccinations: '/api/vaccination'
        },
        comments: {
          list: '/api/comment',
          replies: '/api/reply'
        }
      }
    };

    console.log('✅ Comprehensive health check completed');
    return res.status(200).json(healthData);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false
      }
    });
  }
}
