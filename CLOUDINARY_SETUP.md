# Cloudinary Integration Setup Guide

## ✅ What's Done

All backend code has been updated to use Cloudinary for image storage instead of local ephemeral storage.

### Files Updated:
- ✅ `config/cloudinary.js` - Cloudinary configuration
- ✅ `routes/services.js` - Service image uploads
- ✅ `routes/user-profile.js` - Profile image uploads
- ✅ `routes/chat.js` - Chat media uploads
- ✅ `controllers/servicesController.js` - Service image handling
- ✅ `.env.railway` - Environment variables template

---

## 🔧 Setup Steps

### 1. Create Cloudinary Account (Free)

1. Go to: https://cloudinary.com/users/register_free
2. Sign up with email or Google
3. Verify your email
4. Login to dashboard

### 2. Get Your Credentials

From Cloudinary Dashboard (https://console.cloudinary.com/):

```
Cloud Name: dcxxxxxxxxx
API Key: 123456789012345
API Secret: abcdefghijklmnopqrstuvwxyz123
```

### 3. Update Environment Variables

#### For Local Development (.env):
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

#### For Railway Production:

1. Open Railway Dashboard
2. Go to your project
3. Click on "Variables" tab
4. Add these three variables:
   - `CLOUDINARY_CLOUD_NAME` = your_cloud_name
   - `CLOUDINARY_API_KEY` = your_api_key
   - `CLOUDINARY_API_SECRET` = your_api_secret
5. Click "Deploy" to restart with new variables

---

## 📁 Cloudinary Folder Structure

Images will be organized in these folders:

```
gwadar-services/       → Service images
gwadar-profiles/       → User profile pictures
gwadar-chat/          → Chat images
gwadar-products/      → Product images
```

---

## 🎯 Features

### Automatic Image Optimization
- Images are automatically optimized for web
- Responsive image delivery
- Format conversion (WebP, AVIF)
- Quality optimization

### Image Transformations
- Services: 800x800px max
- Profiles: 500x500px max
- Chat: 1200x1200px max
- Products: 800x800px max

### Benefits
- ✅ Persistent storage (never deleted)
- ✅ Fast CDN delivery worldwide
- ✅ Automatic backups
- ✅ No server disk space used
- ✅ Free tier: 25GB storage + 25GB bandwidth/month

---

## 🔄 Migration Steps

### Option 1: Fresh Start (Recommended)
1. Set up Cloudinary credentials
2. Deploy backend
3. Re-upload all images through admin panel
4. Old local images will be ignored

### Option 2: Migrate Existing Images
```javascript
// Run this script to migrate existing images to Cloudinary
const cloudinary = require('./config/cloudinary');
const fs = require('fs');
const path = require('path');

async function migrateImages() {
  const uploadsDir = './uploads/services';
  const files = fs.readdirSync(uploadsDir);
  
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    try {
      const result = await cloudinary.cloudinary.uploader.upload(filePath, {
        folder: 'gwadar-services',
        public_id: file.split('.')[0]
      });
      console.log(`✅ Migrated: ${file} → ${result.secure_url}`);
    } catch (error) {
      console.error(`❌ Failed: ${file}`, error);
    }
  }
}

migrateImages();
```

---

## 🧪 Testing

### Test Service Image Upload:
1. Login to admin panel
2. Go to Services
3. Create or edit a service
4. Upload an image
5. Check response - should have Cloudinary URL:
   ```
   https://res.cloudinary.com/your_cloud/image/upload/v1234567890/gwadar-services/filename.jpg
   ```

### Test Profile Image Upload:
1. Login as user
2. Go to Profile
3. Upload profile picture
4. Should see Cloudinary URL

### Test Chat Image Upload:
1. Open chat
2. Send an image
3. Image should be stored on Cloudinary

---

## 📊 Monitoring

### Cloudinary Dashboard:
- View all uploaded images
- Check storage usage
- Monitor bandwidth
- View transformations

### Backend Logs:
```bash
✅ File uploaded to Cloudinary: https://res.cloudinary.com/...
✅ Using Cloudinary uploaded file: https://res.cloudinary.com/...
🗑️ Image deleted from Cloudinary: gwadar-services/12345
```

---

## 🚨 Troubleshooting

### Error: "Invalid credentials"
- Check CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET
- Make sure no extra spaces in .env
- Restart server after updating .env

### Error: "Upload failed"
- Check Cloudinary account is active
- Verify free tier limits not exceeded
- Check file size (max 10MB on free tier)

### Images not showing:
- Check database - should have full Cloudinary URL
- Verify Cloudinary dashboard shows uploaded images
- Check browser console for CORS errors

---

## 💰 Pricing

### Free Tier (Perfect for Development):
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month
- Enough for ~2,500 images

### Paid Plans (If Needed):
- Plus: $99/month - 104 GB storage
- Advanced: $249/month - 212 GB storage
- Custom: Contact sales

---

## 🔐 Security

### API Credentials:
- Never commit .env to git
- Use Railway environment variables for production
- Rotate API keys if compromised

### Image Access:
- All images are public by default
- Use signed URLs for private images if needed
- Set up upload presets for additional security

---

## 📚 Documentation

- Cloudinary Docs: https://cloudinary.com/documentation
- Node.js SDK: https://cloudinary.com/documentation/node_integration
- Image Transformations: https://cloudinary.com/documentation/image_transformations

---

## ✅ Checklist

Before deploying to production:

- [ ] Cloudinary account created
- [ ] Credentials added to Railway variables
- [ ] Backend deployed with new code
- [ ] Test service image upload
- [ ] Test profile image upload
- [ ] Test chat image upload
- [ ] Verify images persist after Railway redeploy
- [ ] Check Cloudinary dashboard shows images
- [ ] Monitor storage usage

---

## 🎉 Success!

Once set up, all images will:
- ✅ Upload to Cloudinary automatically
- ✅ Be accessible via fast CDN
- ✅ Persist forever (no more 404s!)
- ✅ Be optimized automatically
- ✅ Work across all devices

No more Railway ephemeral storage issues! 🚀
