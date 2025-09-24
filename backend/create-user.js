const axios = require('axios');

const API_BASE = 'http://10.40.0.230:3000/api';

async function createUser() {
  try {
    console.log('👤 Creating a new test user for you...\n');

    const newUser = {
      fullName: 'Demo User',
      gender: 'Male',
      email: 'demo@example.com',
      password: 'demo123',
      birthdate: '1995-01-01'
    };

    console.log('📝 User details:');
    console.log(`   Name: ${newUser.fullName}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Password: ${newUser.password}`);
    console.log('');

    const response = await axios.post(`${API_BASE}/auth/register`, newUser);
    console.log('✅ User created successfully!');
    console.log('');

    console.log('🔑 You can now log in with:');
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Password: ${newUser.password}`);
    console.log('');

    // Test the login immediately
    console.log('🧪 Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: newUser.email,
      password: newUser.password
    });
    
    console.log('✅ Login test successful!');
    console.log(`   Token received: ${loginResponse.data.token ? 'Yes' : 'No'}`);
    console.log(`   User ID: ${loginResponse.data.user.id}`);

  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message === 'Email already exists') {
      console.log('ℹ️  User already exists. You can use these credentials:');
      console.log('   Email: demo@example.com');
      console.log('   Password: demo123');
    } else {
      console.error('❌ Error creating user:', error.response?.data || error.message);
    }
  }
}

createUser();

