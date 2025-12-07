// Cloudinary upload service
// Note: For production, use @cloudinary/react or direct API calls

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'battlemanager_preset';

// Debug logging for production troubleshooting
const isProduction = import.meta.env.PROD;
console.log(`[Cloudinary] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[Cloudinary] Cloud Name: ${cloudName ? cloudName : '❌ MISSING'}`);
console.log(`[Cloudinary] Upload Preset: ${uploadPreset}`);

// Validate Cloudinary configuration
if (!cloudName) {
  console.error('❌ Cloudinary cloud name is missing. Image uploads will fail.');
  console.error('   Please set VITE_CLOUDINARY_CLOUD_NAME in Vercel environment variables.');
  console.error('   Remember: VITE_ variables are embedded at BUILD TIME - redeploy after adding!');
}

/**
 * Upload image to Cloudinary
 * @param file - File object to upload
 * @param folder - Folder path in Cloudinary
 * @returns Promise with uploaded image URL
 */
export const uploadImage = async (
  file: File,
  folder: string = 'battlemanager'
): Promise<string> => {
  if (!cloudName) {
    throw new Error('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your environment variables.');
  }

  // Helper function to perform upload
  const performUpload = async (includeFolder: boolean): Promise<{ url: string } | { error: string; errorData?: any; status?: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    if (includeFolder && folder) {
      formData.append('folder', folder);
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    console.log(`[Cloudinary] Uploading to: ${uploadUrl}`);
    console.log(`[Cloudinary] Using preset: ${uploadPreset}`);
    console.log(`[Cloudinary] Folder: ${includeFolder ? folder : '(none)'}`);
    console.log(`[Cloudinary] File type: ${file.type}, size: ${(file.size / 1024).toFixed(2)}KB`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    console.log(`[Cloudinary] Response status: ${response.status}`);

    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = 'Upload failed';
      let errorData: any = null;
      try {
        errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
        console.error('[Cloudinary] Error response:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
        console.error('[Cloudinary] Could not parse error response');
      }
      
      // Add helpful hints for common 400 errors
      if (response.status === 400) {
        console.error('[Cloudinary] 400 Error - Common causes:');
        console.error('  1. Upload preset does not exist');
        console.error('  2. Upload preset is not set to "unsigned"');
        console.error('  3. Cloud name is incorrect');
        console.error('  4. Preset has folder restrictions');
        console.error(`  Current config: cloudName="${cloudName}", preset="${uploadPreset}"`);
      }
      
      return { error: errorMessage, errorData, status: response.status };
    }

    const data = await response.json();
    
    if (!data.secure_url) {
      return { error: 'Upload succeeded but no URL returned' };
    }
    
    console.log(`[Cloudinary] Upload successful: ${data.secure_url}`);
    return { url: data.secure_url };
  };

  try {
    // First try with folder
    let result = await performUpload(true);
    
    // If failed and folder was used, try without folder
    if ('error' in result && folder) {
      console.warn('Upload with folder failed, retrying without folder...');
      result = await performUpload(false);
    }
    
    // If still failed, throw error
    if ('error' in result) {
      const errorMessage = result.errorData?.error?.message || result.error || 'Upload failed';
      console.error('Cloudinary error details:', result.errorData || result);
      throw new Error(`Cloudinary upload failed: ${errorMessage} (Status: ${result.status || 'unknown'})`);
    }
    
    return result.url;
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    
    // Provide more helpful error messages
    if (error.message.includes('Cloudinary upload failed')) {
      throw error;
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    throw new Error(error.message || 'Failed to upload image. Please try again.');
  }
};

/**
 * Get optimized image URL from Cloudinary
 */
export const getOptimizedImageUrl = (
  publicId: string,
  width?: number,
  height?: number
): string => {
  let url = `https://res.cloudinary.com/${cloudName}/image/upload`;
  if (width || height) {
    url += `/w_${width || 'auto'},h_${height || 'auto'}`;
  }
  url += `/${publicId}`;
  return url;
};

