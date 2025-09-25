#!/usr/bin/env node

/**
 * Render Deployment Setup Script
 * This script helps configure the backend for Render deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up PetHub Backend for Render deployment...\n');

// Check if we're in the backend directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the backend directory');
  process.exit(1);
}

// Check if Prisma schema exists
if (!fs.existsSync('prisma/schema.prisma')) {
  console.error('❌ Error: Prisma schema not found. Please ensure you have a valid Prisma setup.');
  process.exit(1);
}

// Check if Next.js config exists
if (!fs.existsSync('next.config.js')) {
  console.error('❌ Error: Next.js config not found. Please ensure you have a valid Next.js setup.');
  process.exit(1);
}

console.log('✅ Backend directory structure validated');

// Create environment variables template
const envTemplate = `# Supabase Database Configuration
DATABASE_URL="postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# PostgreSQL connection details
POSTGRES_URL="postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
POSTGRES_USER="postgres"
POSTGRES_HOST="db.kjwbsldbaepwwqsxanok.supabase.co"
POSTGRES_PASSWORD="jdXcUx85kYvbl4XJ"
POSTGRES_DATABASE="postgres"

# Prisma-specific URL (for migrations and direct connections)
POSTGRES_PRISMA_URL="postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Non-pooling URL for migrations
POSTGRES_URL_NON_POOLING="postgres://postgres.kjwbsldbaepwwqsxanok:jdXcUx85kYvbl4XJ@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase Configuration
SUPABASE_URL="https://kjwbsldbaepwwqsxanok.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://kjwbsldbaepwwqsxanok.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqd2JzbGRiYWVwd3dxc3hhbm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTA1MjUsImV4cCI6MjA3NDMyNjUyNX0.puz00qJ1SlZdnj_nsGd9hzU61EV8b2FPaZgFCgz9x9E"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqd2JzbGRiYWVwd3dxc3hhbm9rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODc1MDUyNSwiZXhwIjoyMDc0MzI2NTI1fQ.yddgRiC5Y0hKVnZV5DhR7A6SZX1nxY4zt37_8wdABj0"
SUPABASE_JWT_SECRET="yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg=="

# JWT Secret for authentication
JWT_SECRET="yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg=="

# Application Configuration
NODE_ENV="production"
NEXTAUTH_URL="https://your-render-app.onrender.com"
NEXTAUTH_SECRET="yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg=="
`;

// Write environment template
fs.writeFileSync('env.example', envTemplate);
console.log('✅ Environment variables template created (env.example)');

// Check if all required files exist
const requiredFiles = [
  'package.json',
  'next.config.js',
  'prisma/schema.prisma',
  'pages/api/health.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('\n❌ Some required files are missing. Please ensure your backend is properly set up.');
  process.exit(1);
}

console.log('\n🎉 Backend is ready for Render deployment!');
console.log('\n📋 Next steps:');
console.log('1. Go to render.com and create a new Web Service');
console.log('2. Connect your GitHub repository');
console.log('3. Set Root Directory to "backend"');
console.log('4. Use Build Command: "npm install && npx prisma generate && npm run build"');
console.log('5. Use Start Command: "npm start"');
console.log('6. Add all environment variables from env.example');
console.log('7. Deploy and test your API endpoints');
console.log('\n🔗 Your API will be available at: https://your-app-name.onrender.com/api');
