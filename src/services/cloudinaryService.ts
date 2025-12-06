// Cloudinary upload service
// Note: For production, use @cloudinary/react or direct API calls

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'battlemanager_preset';

// Validate Cloudinary configuration
if (!cloudName) {
  console.warn('⚠️  Cloudinary cloud name is missing. Image uploads will fail.');
  console.warn('   Please set VITE_CLOUDINARY_CLOUD_NAME in your .env.local file');
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

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = 'Upload failed';
      let errorData: any = null;
      try {
        errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      
      return { error: errorMessage, errorData, status: response.status };
    }

    const data = await response.json();
    
    if (!data.secure_url) {
      return { error: 'Upload succeeded but no URL returned' };
    }
    
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

