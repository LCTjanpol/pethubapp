#!/usr/bin/env node

/**
 * Deployment Setup Script for PetHub Capstone
 * This script helps set up the project for deployment to Vercel with Supabase
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up PetHub Capstone for deployment...\n');

try {
  // Step 1: Create .env file if it doesn't exist
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file...');
    execSync('node setup-env.js', { stdio: 'inherit' });
  } else {
    console.log('✅ .env file already exists');
  }

  // Step 2: Install dependencies
  console.log('\n📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Step 3: Generate Prisma client
  console.log('\n🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Step 4: Push database schema
  console.log('\n🗄️  Pushing database schema to Supabase...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  // Step 5: Test database connection
  console.log('\n🔍 Testing database connection...');
  execSync('node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.$connect().then(() => { console.log(\'✅ Database connection successful!\'); process.exit(0); }).catch((e) => { console.error(\'❌ Database connection failed:\', e.message); process.exit(1); });"', { stdio: 'inherit' });

  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Deploy to Vercel: vercel --prod');
  console.log('   2. Update frontend API_URL to your Vercel domain');
  console.log('   3. Test the deployed API endpoints');
  
} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('   1. Make sure you have Node.js and npm installed');
  console.log('   2. Check your internet connection');
  console.log('   3. Verify your Supabase database credentials');
  console.log('   4. Run: node setup-env.js (to create .env file)');
  process.exit(1);
}
