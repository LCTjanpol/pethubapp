/**
 * Database Connection Test Script
 * Tests the connection to the new Supabase database
 */

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    // Test pet count
    const petCount = await prisma.pet.count();
    console.log(`🐾 Found ${petCount} pets in database`);
    
    console.log('🎉 Database is ready for use!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Check your .env file has correct DATABASE_URL');
    console.log('   2. Verify Supabase database is running');
    console.log('   3. Check network connectivity');
    console.log('   4. Run: npx prisma db push (to sync schema)');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
