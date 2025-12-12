import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { uploadImage } from '../services/cloudinaryService';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../shared/utils/errorHandler';

interface QRCodeUploadProps {
  currentQRCodeUrl?: string;
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export const QRCodeUpload: React.FC<QRCodeUploadProps> = ({
  currentQRCodeUrl,
  onUploadSuccess,
  onUploadError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      const url = await uploadImage(file, 'qr-codes');
      onUploadSuccess(url);
      toast.success('QR Code uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      const friendlyError = getUserFriendlyError(error, undefined, 'Failed to upload QR code. Please try again.');
      toast.error(friendlyError);
      onUploadError?.(friendlyError);
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const displayImage = preview || currentQRCodeUrl;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        QR Code Image
      </label>
      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-primary transition">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id="qr-code-upload"
        />
        <label
          htmlFor="qr-code-upload"
          className={`cursor-pointer ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {displayImage ? (
            <div className="space-y-3">
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={displayImage}
                alt="QR Code"
                className="max-w-full max-h-64 mx-auto rounded-lg border border-gray-700"
              />
              <p className="text-xs text-gray-400">
                {isUploading ? 'Uploading...' : 'Click to change QR code'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 mb-2">
                {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
            </div>
          )}
        </label>
      </div>
      {currentQRCodeUrl && !preview && (
        <p className="text-xs text-gray-500">
          Current QR code is displayed above. Upload a new image to replace it.
        </p>
      )}
    </div>
  );
};




