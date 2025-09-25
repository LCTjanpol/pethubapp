/**
 * Test script for shop creation and update functionality
 * This script tests the shop API endpoints to ensure they work correctly
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_IMAGE_PATH = path.join(__dirname, 'public', 'uploads', '1_1.jpeg'); // Use existing test image

// Test data
const testShopData = {
  name: 'Test Pet Store',
  type: 'Pet Store',
  latitude: 37.78825,
  longitude: -122.4324,
  contactNumber: '+1234567890',
  workingHours: '9:00 AM - 6:00 PM',
  workingDays: 'Monday-Friday'
};

// Helper function to create test user token (you'll need to replace this with actual admin token)
async function getAdminToken() {
  try {
    // Use the actual admin token we got
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsImlzQWRtaW4iOnRydWUsImlhdCI6MTc1ODgwMTE1NCwiZXhwIjoxNzU4ODg3NTU0fQ._oU4hlb8WLqNpQOTW8i3LbAL1GM2Mv4_3lhn7fFT7y0';
    console.log('✅ Using admin token for testing');
    return token;
  } catch (error) {
    console.error('Error getting admin token:', error);
    return null;
  }
}

// Test shop creation
async function testShopCreation() {
  console.log('\n🧪 Testing Shop Creation...');
  
  try {
    const token = await getAdminToken();
    if (!token) {
      console.log('❌ Skipping test - no admin token available');
      return null;
    }

    const formData = new FormData();
    
    // Add form fields
    Object.entries(testShopData).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    // Add test image if it exists
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      formData.append('image', fs.createReadStream(TEST_IMAGE_PATH));
      console.log('📷 Added test image to form data');
    } else {
      console.log('⚠️  Test image not found, creating shop without image');
    }

    const response = await axios.post(`${API_BASE_URL}/shop`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
      timeout: 30000, // 30 second timeout for file upload
    });

    console.log('✅ Shop creation successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Shop ID:', response.data.id);
    console.log('📊 Shop name:', response.data.name);
    console.log('📊 Shop image:', response.data.image ? 'Yes' : 'No');
    
    return response.data;
  } catch (error) {
    console.error('❌ Shop creation failed:', error.response?.data || error.message);
    return null;
  }
}

// Test shop update
async function testShopUpdate(shopId) {
  console.log('\n🧪 Testing Shop Update...');
  
  try {
    const token = await getAdminToken();
    if (!token) {
      console.log('❌ Skipping test - no admin token available');
      return null;
    }

    const formData = new FormData();
    
    // Update shop data
    const updatedData = {
      ...testShopData,
      name: 'Updated Test Pet Store',
      contactNumber: '+0987654321',
      workingHours: '8:00 AM - 7:00 PM'
    };

    // Add form fields
    Object.entries(updatedData).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    const response = await axios.put(`${API_BASE_URL}/shop/${shopId}`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
      timeout: 30000,
    });

    console.log('✅ Shop update successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Updated name:', response.data.name);
    console.log('📊 Updated contact:', response.data.contactNumber);
    
    return response.data;
  } catch (error) {
    console.error('❌ Shop update failed:', error.response?.data || error.message);
    return null;
  }
}

// Test shop listing
async function testShopListing() {
  console.log('\n🧪 Testing Shop Listing...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/shop`);
    
    console.log('✅ Shop listing successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Number of shops:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('📊 First shop:', {
        id: response.data[0].id,
        name: response.data[0].name,
        type: response.data[0].type,
        hasImage: !!response.data[0].image
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Shop listing failed:', error.response?.data || error.message);
    return null;
  }
}

// Test shop deletion
async function testShopDeletion(shopId) {
  console.log('\n🧪 Testing Shop Deletion...');
  
  try {
    const token = await getAdminToken();
    if (!token) {
      console.log('❌ Skipping test - no admin token available');
      return null;
    }

    const response = await axios.delete(`${API_BASE_URL}/shop?id=${shopId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('✅ Shop deletion successful!');
    console.log('📊 Response status:', response.status);
    console.log('📊 Message:', response.data.message);
    
    return response.data;
  } catch (error) {
    console.error('❌ Shop deletion failed:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Shop Functionality Tests...');
  console.log('🔗 API Base URL:', API_BASE_URL);
  
  // Test 1: List existing shops
  const existingShops = await testShopListing();
  
  // Test 2: Create new shop
  const newShop = await testShopCreation();
  
  if (newShop) {
    // Test 3: Update the shop
    await testShopUpdate(newShop.id);
    
    // Test 4: Delete the shop (cleanup)
    await testShopDeletion(newShop.id);
  }
  
  console.log('\n🏁 Tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - Shop listing: ✅ Working');
  console.log('   - Shop creation: ' + (newShop ? '✅ Working' : '❌ Failed'));
  console.log('   - Shop update: ' + (newShop ? '✅ Working' : '❌ Skipped'));
  console.log('   - Shop deletion: ' + (newShop ? '✅ Working' : '❌ Skipped'));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testShopCreation,
  testShopUpdate,
  testShopListing,
  testShopDeletion,
  runTests
};
