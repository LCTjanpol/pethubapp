const axios = require('axios');

const API_BASE = 'http://10.40.0.230:3000/api';

async function testPostCreation() {
  console.log('🧪 Testing post creation endpoint...\n');

  try {
    // First, login to get a token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    console.log('');

    // Test 2: Try to create a simple post (without image)
    console.log('2. Testing post creation without image...');
    try {
      const postResponse = await axios.post(`${API_BASE}/post`, {
        caption: 'Test post from API test'
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Post created successfully:', postResponse.data);
    } catch (postError) {
      console.log('❌ Post creation failed:', postError.response?.data || postError.message);
      console.log('Status:', postError.response?.status);
    }
    console.log('');

    // Test 3: Try to create a post with image (multipart form)
    console.log('3. Testing post creation with image...');
    const FormData = require('form-data');
    const fs = require('fs');
    const path = require('path');
    
    // Create a simple test image file (1x1 pixel PNG)
    const testImagePath = path.join(__dirname, 'test-image.png');
    
    // Create a minimal PNG file
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(testImagePath, pngData);
    
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath), 'test.png');
    form.append('caption', 'Test post with image from API test');
    
    try {
      const postWithImageResponse = await axios.post(`${API_BASE}/post`, form, {
        headers: { 
          Authorization: `Bearer ${token}`,
          ...form.getHeaders()
        }
      });
      
      console.log('✅ Post with image created successfully:', postWithImageResponse.data);
    } catch (postImageError) {
      console.log('❌ Post with image creation failed:', postImageError.response?.data || postImageError.message);
      console.log('Status:', postImageError.response?.status);
    }
    
    // Clean up test image
    try {
      fs.unlinkSync(testImagePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    console.log('');
    console.log('4. Testing post retrieval...');
    try {
      const postsResponse = await axios.get(`${API_BASE}/post`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Posts retrieved successfully:', {
        success: postsResponse.data.success,
        postsCount: postsResponse.data.length || 0
      });
    } catch (postsError) {
      console.log('❌ Posts retrieval failed:', postsError.response?.data || postsError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testPostCreation();

