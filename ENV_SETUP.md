# Environment Variables Setup

The `.env.local` file is required for the application to work. Please create it in the root directory with the following content:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyAP2whnBoq3dqb97f1v5nbjZp6X-RZ67ak
VITE_FIREBASE_AUTH_DOMAIN=battlemanager-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=battlemanager-2026
VITE_FIREBASE_STORAGE_BUCKET=battlemanager-2026.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=957958195894
VITE_FIREBASE_APP_ID=1:957958195894:web:fff5fcef3e75b604ff3417
VITE_FIREBASE_MEASUREMENT_ID=G-MEGTCKCQGK
VITE_FIREBASE_DATABASE_URL=https://battlemanager-2026-default-rtdb.asia-southeast1.firebasedatabase.app

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=dtgvwk7ss
VITE_CLOUDINARY_API_KEY=433532155216152
VITE_CLOUDINARY_API_SECRET=EY-pdRZVnWRPpH4Mi5RBSNNKi8k
# Upload Preset (create an unsigned preset in Cloudinary Dashboard > Settings > Upload)
# Default: battlemanager_preset (can be changed if you use a different preset name)
VITE_CLOUDINARY_UPLOAD_PRESET=battlemanager_preset

# Admin Configuration
VITE_ADMIN_EMAIL=admin@battlemanager.com

# Encryption Key
VITE_ENCRYPTION_KEY=battlemanager-secret-key-2026
```

**Important**: After creating `.env.local`, restart the development server for the changes to take effect.

## Quick Setup Command

You can create the file using this command:

```bash
cat > .env.local << 'EOF'
VITE_FIREBASE_API_KEY=AIzaSyAP2whnBoq3dqb97f1v5nbjZp6X-RZ67ak
VITE_FIREBASE_AUTH_DOMAIN=battlemanager-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=battlemanager-2026
VITE_FIREBASE_STORAGE_BUCKET=battlemanager-2026.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=957958195894
VITE_FIREBASE_APP_ID=1:957958195894:web:fff5fcef3e75b604ff3417
VITE_FIREBASE_MEASUREMENT_ID=G-MEGTCKCQGK
VITE_FIREBASE_DATABASE_URL=https://battlemanager-2026-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_CLOUDINARY_CLOUD_NAME=dtgvwk7ss
VITE_CLOUDINARY_API_KEY=433532155216152
VITE_CLOUDINARY_API_SECRET=EY-pdRZVnWRPpH4Mi5RBSNNKi8k
VITE_ADMIN_EMAIL=admin@battlemanager.com
VITE_ENCRYPTION_KEY=battlemanager-secret-key-2026
EOF
```

