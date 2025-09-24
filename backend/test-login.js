const axios = require('axios');

const API_BASE = 'http://10.40.0.230:3000/api';

async function testLogin() {
  console.log('🔍 Testing PetHub Authentication...\n');

  try {
    // Test 1: Check backend health
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend is healthy:', healthResponse.data);
    console.log('');

    // Test 2: Try to register a test user
    console.log('2. Registering a test user...');
    const testUser = {
      fullName: 'Test User',
      gender: 'Male',
      email: 'test@example.com',
      password: 'password123',
      birthdate: '1990-01-01'
    };

    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
      console.log('✅ User registered successfully:', registerResponse.data);
    } catch (registerError) {
      if (registerError.response?.status === 409) {
        console.log('ℹ️  User already exists, continuing with login test...');
      } else {
        console.log('❌ Registration failed:', registerError.response?.data || registerError.message);
        throw registerError;
      }
    }
    console.log('');

    // Test 3: Try to login with the test user
    console.log('3. Testing login...');
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    const loginResponse = await axios.post(`${API_BASE}/auth/login`, loginData);
    console.log('✅ Login successful:', {
      success: loginResponse.data.success,
      token: loginResponse.data.token ? 'Token received' : 'No token',
      isAdmin: loginResponse.data.isAdmin,
      user: loginResponse.data.user
    });
    console.log('');

    // Test 4: Test protected endpoint with token
    console.log('4. Testing protected endpoint...');
    const token = loginResponse.data.token;
    const petsResponse = await axios.get(`${API_BASE}/pet`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Protected endpoint accessible:', {
      success: petsResponse.data.success,
      petsCount: petsResponse.data.length || 0
    });

    console.log('\n🎉 All authentication tests passed!');

  } catch (error) {
    console.error('❌ Authentication test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testLogin();
