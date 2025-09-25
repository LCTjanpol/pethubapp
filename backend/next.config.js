/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for better performance
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
  },
  
  // Configure headers for CORS and API routes
  async headers() {
    return [
      {
        // Apply these headers to all API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cache-Control' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        // Serve static files from uploads directory
        source: '/uploads/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  
  // Add server external packages for better API handling
  serverExternalPackages: ['bcrypt', '@prisma/client'],
  
  // Configure images for Next.js Image component
  images: {
    domains: ['localhost', '10.40.0.230', 'your-render-app.onrender.com'],
    unoptimized: true,
  },
  
  // Optimize for production
  swcMinify: true,
  
  // Configure output for static export if needed
  output: 'standalone',
  
  // Environment variables that should be available on the client
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;