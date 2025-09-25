/**
 * Script to get an admin token for testing
 * This script logs in as an admin user and returns the token
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Admin credentials (you may need to update these based on your database)
const adminCredentials = {
  email: 'pethubadmin@gmail.com', // Update this with your admin email
  password: '987654321' // Update this with your admin password
};

async function getAdminToken() {
  try {
    console.log('🔐 Attempting to login as admin...');
    console.log('📧 Email:', adminCredentials.email);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: adminCredentials.email,
      password: adminCredentials.password
    });

    if (response.data && response.data.token) {
      console.log('✅ Admin login successful!');
      console.log('🎫 Token:', response.data.token);
      console.log('👤 User ID:', response.data.user.id);
      console.log('👑 Is Admin:', response.data.user.isAdmin);
      
      return response.data.token;
    } else {
      console.log('❌ No token in response');
      return null;
    }
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Check if admin user exists in database');
      console.log('   2. Verify admin credentials');
      console.log('   3. Make sure user has isAdmin = true');
    }
    
    return null;
  }
}

// Run if executed directly
if (require.main === module) {
  getAdminToken().then(token => {
    if (token) {
      console.log('\n🎯 Copy this token for testing:');
      console.log(token);
    }
  }).catch(console.error);
}

module.exports = { getAdminToken };
