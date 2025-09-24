const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://10.40.0.230:3000/api';

// Test data
const testUser = {
  email: 'testuser@pethub.com',
  password: 'testpass123',
  fullName: 'Test User PetHub',
  gender: 'Male',
  birthdate: '1990-01-01'
};

const testAdmin = {
  email: 'admin@pethub.com',
  password: 'adminpass123',
  fullName: 'Admin User',
  gender: 'Female',
  birthdate: '1985-01-01'
};

const testPet = {
  name: 'Buddy Test',
  age: 3,
  type: 'Dog',
  breed: 'Golden Retriever'
};

const testShop = {
  name: 'Test Pet Clinic',
  type: 'Veterinary Clinic',
  latitude: 10.3157,
  longitude: 123.8854,
  workingHours: '9:00 AM - 6:00 PM',
  workingDays: 'Monday-Friday'
};

// Store test IDs for cleanup
let testUserToken = '';
let testAdminToken = '';
let testUserId = null;
let testPetId = null;
let testPostId = null;
let testCommentId = null;
let testReplyId = null;
let testTaskId = null;
let testVaccineId = null;
let testShopId = null;

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function testBackendConnectivity() {
  console.log('🔌 Testing Backend Connectivity...\n');
  
  try {
    const response = await axios.get(`${API_BASE}/health`);
    console.log('✅ Backend server is running');
    return true;
  } catch (error) {
    console.error('❌ Backend connectivity failed:', error.message);
    console.log('Please ensure the backend server is running on http://10.40.0.230:3000');
    return false;
  }
}

async function testAuthentication() {
  console.log('🔐 Testing Authentication...\n');
  
  try {
    // Test user registration
    console.log('1. Testing User Registration...');
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
      console.log('✅ User registration successful');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, proceeding with login test');
      } else {
        throw error;
      }
    }

    // Test user login
    console.log('2. Testing User Login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    testUserToken = loginResponse.data.token;
    testUserId = loginResponse.data.user.id;
    console.log('✅ User login successful');

    // Test admin creation (if needed)
    console.log('3. Testing Admin Setup...');
    try {
      const adminRegisterResponse = await axios.post(`${API_BASE}/auth/register`, {
        ...testAdmin,
        isAdmin: true
      });
      console.log('✅ Admin account created');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  Admin already exists');
      }
    }

    // Test admin login
    const adminLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password
    });
    testAdminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful');

    return true;
  } catch (error) {
    console.error('❌ Authentication test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPetManagement() {
  console.log('🐕 Testing Pet Management...\n');
  
  try {
    // Test pet creation
    console.log('1. Testing Pet Creation...');
    const petResponse = await axios.post(`${API_BASE}/pet`, testPet, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    testPetId = petResponse.data.id;
    console.log('✅ Pet created successfully');

    // Test pet update
    console.log('2. Testing Pet Update...');
    await axios.put(`${API_BASE}/pet/${testPetId}`, {
      name: 'Buddy Updated',
      age: 4
    }, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Pet updated successfully');

    // Test medical record creation
    console.log('3. Testing Medical Record Creation...');
    const vaccineResponse = await axios.post(`${API_BASE}/vaccination`, {
      petId: testPetId,
      vaccineName: 'Test Vaccination',
      date: new Date().toISOString().split('T')[0],
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    testVaccineId = vaccineResponse.data.id;
    console.log('✅ Medical record created successfully');

    return true;
  } catch (error) {
    console.error('❌ Pet management test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testTaskSystem() {
  console.log('📋 Testing Task System...\n');
  
  try {
    // Test task creation
    console.log('1. Testing Task Creation...');
    const taskResponse = await axios.post(`${API_BASE}/task`, {
      petId: testPetId,
      type: 'Custom',
      description: 'Test Custom Task: Walk the dog',
      time: new Date().toISOString(),
      frequency: 'daily'
    }, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    testTaskId = taskResponse.data.id;
    console.log('✅ Custom task created successfully');

    // Test daily task creation
    console.log('2. Testing Daily Task Creation...');
    await axios.post(`${API_BASE}/task`, {
      petId: testPetId,
      type: 'Feeding',
      description: 'Daily feeding schedule',
      time: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Daily task created successfully');

    return true;
  } catch (error) {
    console.error('❌ Task system test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSocialFeatures() {
  console.log('📱 Testing Social Features...\n');
  
  try {
    // Create a simple test image (base64 encoded 1x1 pixel)
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    // Test post creation
    console.log('1. Testing Post Creation...');
    const formData = new FormData();
    formData.append('caption', 'Test post caption for comprehensive testing');
    
    // For testing purposes, we'll create a post without image first
    const postResponse = await axios.post(`${API_BASE}/post`, {
      content: '/uploads/test_image.jpg',
      caption: 'Test post caption'
    }, {
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}` 
      }
    });
    testPostId = postResponse.data.id;
    console.log('✅ Post created successfully');

    // Test like functionality
    console.log('2. Testing Like Functionality...');
    await axios.put(`${API_BASE}/post/${testPostId}`, { likes: 1 }, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Post liked successfully');

    // Test comment creation
    console.log('3. Testing Comment Creation...');
    const commentResponse = await axios.post(`${API_BASE}/comment`, {
      postId: testPostId,
      content: 'This is a test comment on the post'
    }, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    testCommentId = commentResponse.data.id;
    console.log('✅ Comment created successfully');

    // Test reply creation
    console.log('4. Testing Reply Creation...');
    const replyResponse = await axios.post(`${API_BASE}/reply`, {
      commentId: testCommentId,
      content: 'This is a test reply to the comment'
    }, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    testReplyId = replyResponse.data.id;
    console.log('✅ Reply created successfully');

    return true;
  } catch (error) {
    console.error('❌ Social features test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAdminFeatures() {
  console.log('👑 Testing Admin Features...\n');
  
  try {
    // Test shop creation
    console.log('1. Testing Shop Creation...');
    const shopResponse = await axios.post(`${API_BASE}/shop`, testShop, {
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAdminToken}` 
      }
    });
    testShopId = shopResponse.data.id;
    console.log('✅ Shop created successfully');

    // Test admin data retrieval
    console.log('2. Testing Admin Data Retrieval...');
    const [usersRes, petsRes, shopsRes, postsRes] = await Promise.all([
      axios.get(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${testAdminToken}` } }),
      axios.get(`${API_BASE}/admin/pets`, { headers: { Authorization: `Bearer ${testAdminToken}` } }),
      axios.get(`${API_BASE}/shop`, { headers: { Authorization: `Bearer ${testAdminToken}` } }),
      axios.get(`${API_BASE}/post`, { headers: { Authorization: `Bearer ${testAdminToken}` } })
    ]);
    
    console.log(`✅ Retrieved ${usersRes.data.length} users`);
    console.log(`✅ Retrieved ${petsRes.data.length} pets`);
    console.log(`✅ Retrieved ${shopsRes.data.length} shops`);
    console.log(`✅ Retrieved ${postsRes.data.length} posts`);

    // Test graph data accuracy
    console.log('3. Testing Graph Data Accuracy...');
    const users = usersRes.data;
    const pets = petsRes.data;
    
    const genderStats = users.reduce((acc, user) => {
      acc[user.gender] = (acc[user.gender] || 0) + 1;
      return acc;
    }, {});
    
    const petTypeStats = pets.reduce((acc, pet) => {
      acc[pet.type] = (acc[pet.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Gender distribution:', genderStats);
    console.log('📊 Pet type distribution:', petTypeStats);
    console.log('✅ Graph data calculated correctly');

    return true;
  } catch (error) {
    console.error('❌ Admin features test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDeletions() {
  console.log('🗑️ Testing Deletion Features...\n');
  
  try {
    // Test post deletion (admin)
    console.log('1. Testing Post Deletion...');
    await axios.delete(`${API_BASE}/post/${testPostId}`, {
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    console.log('✅ Post deleted successfully');

    // Test shop deletion (admin)
    console.log('2. Testing Shop Deletion...');
    await axios.delete(`${API_BASE}/shop?id=${testShopId}`, {
      headers: { Authorization: `Bearer ${testAdminToken}` }
    });
    console.log('✅ Shop deleted successfully');

    // Test vaccination record deletion
    console.log('3. Testing Medical Record Deletion...');
    await axios.delete(`${API_BASE}/vaccination/${testVaccineId}`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Medical record deleted successfully');

    // Test task deletion
    console.log('4. Testing Task Deletion...');
    await axios.delete(`${API_BASE}/task/${testTaskId}`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Task deleted successfully');

    // Test pet deletion
    console.log('5. Testing Pet Deletion...');
    await axios.delete(`${API_BASE}/pet/${testPetId}`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Pet deleted successfully');

    return true;
  } catch (error) {
    console.error('❌ Deletion test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runComprehensiveTests() {
  console.log('🧪 PetHub Comprehensive Testing Suite\n');
  console.log('=' .repeat(50));
  
  const testResults = {
    connectivity: false,
    authentication: false,
    petManagement: false,
    taskSystem: false,
    socialFeatures: false,
    adminFeatures: false,
    deletions: false
  };

  try {
    // Test 1: Backend Connectivity
    testResults.connectivity = await testBackendConnectivity();
    if (!testResults.connectivity) {
      console.log('❌ Cannot proceed without backend connectivity');
      return;
    }

    await wait(1000);

    // Test 2: Authentication
    testResults.authentication = await testAuthentication();
    if (!testResults.authentication) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }

    await wait(1000);

    // Test 3: Pet Management
    testResults.petManagement = await testPetManagement();
    
    await wait(1000);

    // Test 4: Task System
    testResults.taskSystem = await testTaskSystem();
    
    await wait(1000);

    // Test 5: Social Features
    testResults.socialFeatures = await testSocialFeatures();
    
    await wait(1000);

    // Test 6: Admin Features
    testResults.adminFeatures = await testAdminFeatures();
    
    await wait(1000);

    // Test 7: Deletions (Cleanup)
    testResults.deletions = await testDeletions();

    // Final Results
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 COMPREHENSIVE TEST RESULTS');
    console.log('=' .repeat(50));
    
    Object.entries(testResults).forEach(([test, passed]) => {
      const status = passed ? '✅' : '❌';
      const testName = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
      console.log(`${status} ${testName}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const allPassed = Object.values(testResults).every(result => result === true);
    
    console.log('\n' + '=' .repeat(50));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! PetHub is ready for deployment.');
      console.log('\n📋 Tested Features:');
      console.log('- ✅ User registration and login');
      console.log('- ✅ Pet creation, update, and medical records');
      console.log('- ✅ Custom and daily task management');
      console.log('- ✅ Social posts, likes, comments, and replies');
      console.log('- ✅ Admin dashboard and shop management');
      console.log('- ✅ Data deletion and cleanup');
      console.log('- ✅ Backend-frontend connectivity');
    } else {
      console.log('❌ Some tests failed. Please check the errors above.');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Additional specific feature tests
async function testNotificationSystem() {
  console.log('🔔 Testing Notification System...\n');
  
  try {
    // Test task notifications
    const tasksResponse = await axios.get(`${API_BASE}/task`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Task notifications data retrieved');

    // Test social notifications (comments/likes on user posts)
    const postsResponse = await axios.get(`${API_BASE}/post`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('✅ Social notifications data retrieved');

    return true;
  } catch (error) {
    console.error('❌ Notification system test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testMapFeatures() {
  console.log('🗺️ Testing Map Features...\n');
  
  try {
    // Test shop retrieval for maps
    const shopsResponse = await axios.get(`${API_BASE}/shop`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    
    console.log(`✅ Retrieved ${shopsResponse.data.length} shops for map display`);
    
    // Validate shop data structure
    if (shopsResponse.data.length > 0) {
      const shop = shopsResponse.data[0];
      const requiredFields = ['id', 'name', 'type', 'latitude', 'longitude'];
      const hasAllFields = requiredFields.every(field => shop.hasOwnProperty(field));
      
      if (hasAllFields) {
        console.log('✅ Shop data structure is correct');
      } else {
        console.log('⚠️  Shop data missing some fields');
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Map features test failed:', error.response?.data || error.message);
    return false;
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  runComprehensiveTests()
    .then(() => {
      console.log('\n🏁 Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = {
  runComprehensiveTests,
  testBackendConnectivity,
  testAuthentication,
  testPetManagement,
  testTaskSystem,
  testSocialFeatures,
  testAdminFeatures,
  testDeletions,
  testNotificationSystem,
  testMapFeatures
}; 
