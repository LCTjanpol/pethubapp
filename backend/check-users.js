const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        isAdmin: true,
        createdAt: true
      }
    });

    console.log(`Found ${users.length} users in database:`);
    console.log('');

    if (users.length === 0) {
      console.log('❌ No users found in database.');
      console.log('💡 Try registering a new user first.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Name: ${user.fullName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
        console.log(`   Created: ${user.createdAt.toISOString()}`);
        console.log('');
      });

      // Test login for the first user
      console.log('🧪 Testing login for first user...');
      const testUser = users[0];
      console.log(`Email: ${testUser.email}`);
      console.log('Password: (you need to provide the correct password)');
      console.log('');
      console.log('💡 If you forgot the password, you can:');
      console.log('   1. Register a new user with different email');
      console.log('   2. Or reset the database and register again');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
