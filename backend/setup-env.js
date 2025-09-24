#!/usr/bin/env node

/**
 * Environment Setup Script for PetHub Capstone
 * This script creates the .env file with the new Supabase database configuration
 * Run this script after cloning the repository to set up your environment
 */

const fs = require('fs');
const path = require('path');

// Environment variables for the new Supabase database
const envContent = `# Supabase Database Configuration
# Main database URL for Prisma (using connection pooling)
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

# JWT Secret for authentication (using Supabase JWT secret)
JWT_SECRET="yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg=="

# Application Configuration
NODE_ENV="development"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="yQbpaR8EIYdGzhMZ/v38CHrvd2QNnolC2Q0Uf9jyrIZcST+d1vWGZzHCZv6uMWghyc20LD+IMTM2yfWnDmeWrg=="
`;

// Path to the .env file
const envPath = path.join(__dirname, '.env');

try {
  // Check if .env file already exists
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists. Backing up to .env.backup');
    fs.copyFileSync(envPath, path.join(__dirname, '.env.backup'));
  }

  // Write the new .env file
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file (.env) created successfully!');
  console.log('📋 Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. Run: npx prisma generate');
  console.log('   3. Run: npx prisma db push');
  console.log('   4. Run: npm run dev');
  
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
