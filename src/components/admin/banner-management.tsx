import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { firestore, auth } from '../../services/firebaseService';
import { uploadImage } from '../../services/cloudinaryService';
import { Banner } from '../../types/Banner';
import { motion } from 'framer-motion';
import { HiTrash, HiPlus, HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';

export const BannerManagement: React.FC = () => {
  const [banners, loading] = useCollection(
    query(collection(firestore, 'banners'), orderBy('order', 'asc'))
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    tournament_id: '',
    link_url: '',
    image: null as File | null,
    preview: null as string | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setFormData({ ...formData, image: file });
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, image: file, preview: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleCreateBanner = async () => {
    if (!formData.image) {
      toast.error('Please select an image');
      return;
    }

    setIsUploading(true);
    try {
      // Refresh admin token to ensure it has the latest claims
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      // Upload image to Cloudinary
      const imageUrl = await uploadImage(formData.image, 'banners');

      // Get next order number
      const nextOrder = banners?.docs.length || 0;

      // Create banner document - remove undefined fields (Firebase doesn't allow undefined)
      const bannerData: any = {
        image_url: imageUrl,
        is_active: true,
        order: nextOrder,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Only add optional fields if they have values
      if (formData.title && formData.title.trim()) {
        bannerData.title = formData.title.trim();
      }
      if (formData.subtitle && formData.subtitle.trim()) {
        bannerData.subtitle = formData.subtitle.trim();
      }
      if (formData.tournament_id && formData.tournament_id.trim()) {
        bannerData.tournament_id = formData.tournament_id.trim();
      }
      if (formData.link_url && formData.link_url.trim()) {
        bannerData.link_url = formData.link_url.trim();
      }

      await addDoc(collection(firestore, 'banners'), bannerData);

      toast.success('Banner created successfully!');
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating banner:', error);
      
      // Provide helpful error message for permission errors
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        toast.error('Permission denied. Please sign out and sign in again to refresh your admin token.');
      } else {
        toast.error(error.message || 'Failed to create banner');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      // Refresh admin token to ensure it has the latest claims
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      await deleteDoc(doc(firestore, 'banners', bannerId));
      toast.success('Banner deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting banner:', error);
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        toast.error('Permission denied. Please sign out and sign in again.');
      } else {
        toast.error('Failed to delete banner');
      }
    }
  };

  const handleToggleActive = async (bannerId: string, currentActive: boolean) => {
    try {
      // Refresh admin token to ensure it has the latest claims
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      await updateDoc(doc(firestore, 'banners', bannerId), {
        is_active: !currentActive,
        updated_at: new Date(),
      });
      toast.success(`Banner ${!currentActive ? 'shown' : 'hidden'}!`);
    } catch (error: any) {
      console.error('Error updating banner:', error);
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        toast.error('Permission denied. Please sign out and sign in again.');
      } else {
        toast.error('Failed to update banner');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      tournament_id: '',
      link_url: '',
      image: null,
      preview: null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-bg font-heading font-semibold rounded-lg hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <HiPlus className="w-5 h-5" />
          <span>Create Banner</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : banners?.docs.length === 0 ? (
        <div className="text-center py-12 bg-bg-secondary rounded-lg border border-gray-800">
          <p className="text-gray-400 mb-4">No banners created yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-bg rounded-lg hover:bg-primary/80 transition-colors"
          >
            Create First Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners?.docs.map((doc) => {
            const banner = { id: doc.id, ...doc.data() } as Banner;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary border border-gray-800 rounded-lg overflow-hidden"
              >
                <div className="relative h-40">
                  <img
                    src={banner.image_url}
                    alt={banner.title || 'Banner'}
                    className="w-full h-full object-cover"
                  />
                  {!banner.is_active && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-accent font-heading">Hidden</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {banner.title && (
                    <h3 className="text-white font-heading mb-1">{banner.title}</h3>
                  )}
                  {banner.subtitle && (
                    <p className="text-gray-400 text-sm mb-2">{banner.subtitle}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => handleToggleActive(banner.id, banner.is_active)}
                      className={`px-4 py-2 rounded-lg text-sm font-body font-semibold transition-all ${
                        banner.is_active
                          ? 'bg-primary text-bg hover:bg-primary/80 border border-primary'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      }`}
                      aria-label={banner.is_active ? 'Hide banner' : 'Show banner'}
                    >
                      {banner.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2 text-accent hover:bg-accent/20 rounded transition-colors"
                      aria-label="Delete banner"
                    >
                      <HiTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-secondary border border-primary rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-heading text-primary">Create Banner</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-body text-gray-400 mb-2">
                  Banner Image *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-body file:bg-primary file:text-bg hover:file:bg-primary/80"
                />
                {formData.preview && (
                  <div className="mt-4 relative h-48 rounded-lg overflow-hidden border border-gray-800">
                    <img
                      src={formData.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-body text-gray-400 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Banner title"
                  className="w-full px-4 py-2 bg-bg border border-gray-800 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-body text-gray-400 mb-2">
                  Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Banner subtitle"
                  className="w-full px-4 py-2 bg-bg border border-gray-800 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Tournament ID */}
              <div>
                <label className="block text-sm font-body text-gray-400 mb-2">
                  Tournament ID (Optional - links to tournament)
                </label>
                <input
                  type="text"
                  value={formData.tournament_id}
                  onChange={(e) => setFormData({ ...formData, tournament_id: e.target.value })}
                  placeholder="Tournament ID"
                  className="w-full px-4 py-2 bg-bg border border-gray-800 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Custom Link */}
              <div>
                <label className="block text-sm font-body text-gray-400 mb-2">
                  Custom Link URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 bg-bg border border-gray-800 rounded-lg text-white focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If both Tournament ID and Link URL are provided, Tournament ID takes priority
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBanner}
                  disabled={isUploading || !formData.image}
                  className="flex-1 px-4 py-2 bg-primary text-bg rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Create Banner'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

