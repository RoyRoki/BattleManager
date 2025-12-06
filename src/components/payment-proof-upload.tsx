import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { uploadImage } from '../services/cloudinaryService';
import toast from 'react-hot-toast';

interface PaymentProofUploadProps {
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
}

export const PaymentProofUpload: React.FC<PaymentProofUploadProps> = ({
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
      const url = await uploadImage(file, 'payment-proofs');
      onUploadSuccess(url);
      toast.success('Payment proof uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      onUploadError?.(error.message || 'Upload failed');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm mb-2">Payment Proof (Screenshot/Image)</label>
      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-primary transition">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id="payment-proof-upload"
        />
        <label
          htmlFor="payment-proof-upload"
          className={`cursor-pointer ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {preview ? (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto rounded-lg"
            />
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
    </div>
  );
};


