# Cloudinary Upload Preset Setup

To enable image uploads (banners, payment proofs, etc.), you need to create an **unsigned upload preset** in your Cloudinary account.

## Steps to Create Upload Preset

1. **Log in to Cloudinary Dashboard**
   - Go to https://cloudinary.com/console
   - Sign in with your account

2. **Navigate to Upload Settings**
   - Click on **Settings** (gear icon) in the top menu
   - Click on **Upload** in the left sidebar

3. **Create Upload Preset**
   - Scroll down to **Upload presets** section
   - Click **Add upload preset**
   - Configure the preset:
     - **Preset name**: `battlemanager_preset` (or use the name from your `.env.local`)
     - **Signing mode**: Select **Unsigned** (important!)
     - **Folder**: `battlemanager` (optional, for organization)
     - **Allowed formats**: Select image formats (jpg, png, webp, etc.)
     - **Max file size**: Set appropriate limit (e.g., 10MB)
     - **Transformation**: Leave default or configure as needed
   - Click **Save**

4. **Update Environment Variable** (if using different preset name)
   ```env
   VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
   ```

5. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Important Notes

- **Unsigned preset is required**: The app uses unsigned uploads for security (no API secret exposed in client)
- **Preset name must match**: The preset name in Cloudinary must match `VITE_CLOUDINARY_UPLOAD_PRESET` in your `.env.local`
- **Folder parameter**: Some presets may not support the folder parameter. If you get errors, try removing the folder from the preset configuration.

## Troubleshooting

### Error: 400 Bad Request
- **Check preset exists**: Verify the preset name in Cloudinary Dashboard
- **Check preset is unsigned**: Must be set to "Unsigned" mode
- **Check cloud name**: Verify `VITE_CLOUDINARY_CLOUD_NAME` matches your Cloudinary account

### Error: Upload failed
- Check browser console for detailed error message
- Verify network connection
- Check Cloudinary service status: https://status.cloudinary.com/

## Testing Upload

After setup, test the upload by:
1. Go to Admin Dashboard → Settings → Hero Banners
2. Click "Create Banner"
3. Upload an image
4. If successful, the image URL will be saved to Firestore







