// Cloudinary upload service
// Note: For production, use @cloudinary/react or direct API calls

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
// const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || ''; // Not used in direct upload
// const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || ''; // Not used in direct upload

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
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'battlemanager_preset');
  formData.append('folder', folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image. Please try again.');
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

