import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Upload file to Supabase Storage
 * @param file - File buffer or stream
 * @param bucketName - Name of the storage bucket
 * @param fileName - Name for the file in storage
 * @param contentType - MIME type of the file
 * @returns Promise with upload result
 */
export async function uploadToSupabaseStorage(
  file: Buffer,
  bucketName: string,
  fileName: string,
  contentType: string
) {
  try {
    console.log(`Uploading ${fileName} to bucket ${bucketName}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType,
        upsert: true, // Overwrite if file exists
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw error;
    }

    console.log('File uploaded successfully:', data);
    
    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return {
      success: true,
      path: data.path,
      publicUrl: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error uploading to Supabase storage:', error);
    throw error;
  }
}

/**
 * Delete file from Supabase Storage
 * @param bucketName - Name of the storage bucket
 * @param fileName - Name of the file to delete
 * @returns Promise with deletion result
 */
export async function deleteFromSupabaseStorage(
  bucketName: string,
  fileName: string
) {
  try {
    console.log(`Deleting ${fileName} from bucket ${bucketName}`);
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      throw error;
    }

    console.log('File deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error deleting from Supabase storage:', error);
    throw error;
  }
}

/**
 * Get public URL for a file in Supabase Storage
 * @param bucketName - Name of the storage bucket
 * @param fileName - Name of the file
 * @returns Public URL for the file
 */
export function getSupabaseStorageUrl(bucketName: string, fileName: string): string {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);
  
  return data.publicUrl;
}

/**
 * Check if file exists in Supabase Storage
 * @param bucketName - Name of the storage bucket
 * @param fileName - Name of the file to check
 * @returns Promise with existence result
 */
export async function fileExistsInSupabaseStorage(
  bucketName: string,
  fileName: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        search: fileName,
      });

    if (error) {
      console.error('Error checking file existence:', error);
      return false;
    }

    return data.some(file => file.name === fileName);
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

// Storage bucket names
export const STORAGE_BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  POST_IMAGES: 'post-images',
  PET_IMAGES: 'pet-images',
  SHOP_IMAGES: 'shop-images',
} as const;

export default supabase;
