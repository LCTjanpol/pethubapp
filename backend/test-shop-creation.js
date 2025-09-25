const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test shop creation with image upload
async function testShopCreation() {
  try {
    console.log('🧪 Testing shop creation with image upload...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'pethubadmin@gmail.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Create FormData for shop creation
    const formData = new FormData();
    formData.append('name', 'Test Shop');
    formData.append('type', 'Veterinary Clinic');
    formData.append('latitude', '10.3157');
    formData.append('longitude', '123.8854');
    formData.append('contactNumber', '09123456789');
    formData.append('workingHours', '8:00 AM - 5:00 PM');
    formData.append('workingDays', 'Monday to Friday');
    
    // Create a test image file
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    if (fs.existsSync(testImagePath)) {
      formData.append('image', fs.createReadStream(testImagePath));
      console.log('📤 Test image added to form data');
    } else {
      console.log('⚠️ No test image found, creating shop without image');
    }
    
    // Send shop creation request
    const response = await axios.post('http://localhost:3000/api/shop', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000
    });
    
    console.log('✅ Shop creation successful:', response.status);
    console.log('📋 Shop data:', response.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', error.response.data);
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testShopCreation();
}

module.exports = { testShopCreation };
