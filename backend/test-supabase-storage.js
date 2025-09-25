const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test Supabase Storage connection and bucket creation
async function testSupabaseStorage() {
  console.log('🧪 Testing Supabase Storage connection...');
  
  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('📋 Environment variables:');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Test connection by listing buckets
    console.log('\n📦 Listing existing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    console.log('✅ Existing buckets:', buckets.map(b => b.name));
    
    // Check if shop-images bucket exists
    const shopImagesBucket = buckets.find(b => b.name === 'shop-images');
    if (!shopImagesBucket) {
      console.log('\n📦 Creating shop-images bucket...');
      const { data, error } = await supabase.storage.createBucket('shop-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (error) {
        console.error('❌ Error creating shop-images bucket:', error);
        return;
      }
      
      console.log('✅ shop-images bucket created successfully');
    } else {
      console.log('✅ shop-images bucket already exists');
    }
    
    // Test upload with a small test file
    console.log('\n🧪 Testing file upload...');
    const testFileName = `test_${Date.now()}.txt`;
    const testContent = Buffer.from('This is a test file for Supabase Storage');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('shop-images')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('❌ Error uploading test file:', uploadError);
      return;
    }
    
    console.log('✅ Test file uploaded successfully:', uploadData);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('shop-images')
      .getPublicUrl(testFileName);
    
    console.log('✅ Public URL:', urlData.publicUrl);
    
    // Clean up test file
    console.log('\n🧹 Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('shop-images')
      .remove([testFileName]);
    
    if (deleteError) {
      console.error('❌ Error deleting test file:', deleteError);
    } else {
      console.log('✅ Test file deleted successfully');
    }
    
    console.log('\n🎉 Supabase Storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSupabaseStorage().catch(console.error);
