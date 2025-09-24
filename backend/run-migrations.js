#!/usr/bin/env node

/**
 * Database Migration Script for Vercel Deployment
 * Run this script after deploying to Vercel to set up the database
 */

const { execSync } = require('child_process');

console.log('🚀 Running PetHub Database Migrations...\n');

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Run database migrations
  console.log('🗄️ Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('\n✅ Database migrations completed successfully!');
  console.log('🎉 Your PetHub backend is now ready to use!');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.log('\n📝 Manual steps:');
  console.log('1. Make sure your DATABASE_URL is correct in Vercel environment variables');
  console.log('2. Run: npx prisma generate');
  console.log('3. Run: npx prisma migrate deploy');
  process.exit(1);
}
