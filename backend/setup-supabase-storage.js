#!/usr/bin/env node

/**
 * Setup Supabase Storage Buckets
 * This script creates the necessary storage buckets for the PetHub application
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define storage buckets to create
const buckets = [
  {
    id: 'profile-images',
    name: 'Profile Images',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'post-images',
    name: 'Post Images',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'pet-images',
    name: 'Pet Images',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'shop-images',
    name: 'Shop Images',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
];

async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets...\n');

  for (const bucket of buckets) {
    try {
      console.log(`📦 Creating bucket: ${bucket.name} (${bucket.id})`);
      
      // Check if bucket already exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`❌ Error listing buckets:`, listError);
        continue;
      }

      const bucketExists = existingBuckets.some(b => b.id === bucket.id);
      
      if (bucketExists) {
        console.log(`✅ Bucket ${bucket.id} already exists`);
        continue;
      }

      // Create the bucket
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });

      if (error) {
        console.error(`❌ Error creating bucket ${bucket.id}:`, error);
        continue;
      }

      console.log(`✅ Successfully created bucket: ${bucket.id}`);
      
    } catch (error) {
      console.error(`❌ Unexpected error creating bucket ${bucket.id}:`, error);
    }
  }

  console.log('\n🎉 Storage bucket setup completed!');
  console.log('\n📋 Created buckets:');
  buckets.forEach(bucket => {
    console.log(`  - ${bucket.name} (${bucket.id})`);
  });
  
  console.log('\n🔗 You can view your buckets in the Supabase dashboard:');
  console.log(`   ${supabaseUrl.replace('/rest/v1', '')}/storage/buckets`);
}

// Run the setup
setupStorageBuckets().catch(console.error);
