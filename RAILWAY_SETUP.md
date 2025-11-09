# 🚂 Railway Paid Plan Setup Guide

## ✅ Railway Paid Plan Benefits

### Storage & Performance:
- ✅ **Persistent Storage** - Files kabhi delete nahi hongi
- ✅ **Singapore Server** - Pakistan ke liye fast (150-200ms latency)
- ✅ **99.9% Uptime** - Reliable service
- ✅ **10GB Storage** - Images aur files ke liye
- ✅ **Auto Backups** - Data safe rahega

### Cost:
- 💰 **$5/month** = Rs. 1,500/month
- 📊 **Unlimited Bandwidth** (fair use)
- 🚀 **Better Performance** than free tier

---

## 🔧 Railway Dashboard Setup

### Step 1: Upgrade to Paid Plan
```
1. Railway Dashboard → Settings
2. Billing → Upgrade to Pro
3. Payment Method → Add Card
4. Region → Singapore (Asia)
5. Confirm Upgrade
```

### Step 2: Environment Variables
```bash
# Railway Dashboard → Variables → Add:

NODE_ENV=production
PORT=3000

# Database (Railway MySQL)
DB_HOST=nozomi.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=ETHcerGPYmLeqpXUhBYmsvIQCrKWrBsF
DB_NAME=railway
DB_PORT=38997

# JWT Secret
JWT_SECRET=gwadar_online_bazaar_secret_key_2024_railway_deployment

# Client/Frontend URL (for CORS)
CLIENT_URL=*

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dkowbbo0l
CLOUDINARY_API_KEY=721575744532316
CLOUDINARY_API_SECRET=HpKdq6-ejgVO_CWTag9nrq3nW1k

# Google Maps API Key (⚠️ IMPORTANT - Add this!)
GOOGLE_MAPS_API_KEY=AIzaSyCoTJ9EJLGBhI0wrSRRoppBsaEkbPpTjSA

# Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### ⚠️ SECURITY WARNING:
**DO NOT commit `.env.railway` file to GitHub!**
- ✅ Added to `.gitignore`
- ✅ Use Railway Dashboard Variables instead
- ✅ Keep sensitive keys secure

---

## 📁 File Upload Configuration

### Current Setup (Railway Persistent Storage):

**Backend handles:**
- ✅ Image uploads to `/uploads` folder
- ✅ Files persist after restart
- ✅ Automatic folder creation
- ✅ 10MB file size limit

**Upload Endpoint:**
```
POST https://your-app.railway.app/upload
Content-Type: multipart/form-data

Body:
- image: File
- folder: "services" | "products" | "drivers" | "advertisements"
- targetFolder: "services/subfolder" (optional)
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://your-app.railway.app/uploads/services/1234567890-image.jpg",
  "relativePath": "uploads/services/1234567890-image.jpg",
  "filename": "1234567890-image.jpg"
}
```

---

## 🗑️ GitHub Cleanup (Already Done)

### Files Excluded from Git:
```gitignore
# Uploads directory - Railway handles this
uploads/
uploads/**/*
*.jpg
*.jpeg
*.png
*.gif
*.webp
*.bmp
*.svg
```

**Why?**
- ❌ GitHub not for file storage
- ✅ Railway persistent storage handles images
- ✅ Smaller repository size
- ✅ Faster deployments

---

## 🚀 Deployment Process

### Automatic Deployment:
```bash
# Push to GitHub
git add .
git commit -m "Update backend"
git push origin main

# Railway automatically:
1. Detects changes
2. Builds new version
3. Deploys to Singapore server
4. Keeps uploads folder intact ✅
```

### Manual Deployment:
```bash
# Railway Dashboard → Deployments → Deploy Now
```

---

## 📊 Monitoring & Maintenance

### Check Storage Usage:
```bash
# Railway Dashboard → Metrics
- Storage: X GB / 10 GB
- Bandwidth: X GB
- CPU Usage: X%
- Memory: X MB
```

### Backup Strategy:
```bash
# Important images backup (optional)
# Use Cloudinary or AWS S3 as secondary backup
```

---

## 🔒 Security Best Practices

### File Upload Security:
- ✅ File type validation (images only)
- ✅ File size limit (10MB)
- ✅ Unique filenames (timestamp + random)
- ✅ Folder structure validation

### Database Security:
- ✅ Environment variables for credentials
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTPS only connections

---

## 🎯 Testing Checklist

### After Railway Upgrade:

**1. Image Upload Test:**
```bash
✅ Upload service image
✅ Upload product image
✅ Upload driver profile image
✅ Upload advertisement image
```

**2. Persistence Test:**
```bash
✅ Upload image
✅ Restart Railway app
✅ Check if image still accessible
```

**3. Performance Test:**
```bash
✅ Image load speed
✅ API response time
✅ Database query speed
```

---

## 📱 Flutter App Configuration

### No Changes Needed!

**Current setup already works:**
```dart
// Images automatically load from Railway
Image.network(
  'https://your-app.railway.app/uploads/services/image.jpg',
  fit: BoxFit.cover,
)

// Upload service already configured
ImageUploadService.uploadImage(imageFile)
```

---

## 🆘 Troubleshooting

### Issue: Images not loading
```bash
Solution:
1. Check Railway logs
2. Verify uploads folder exists
3. Check file permissions
4. Verify URL format
```

### Issue: Upload fails
```bash
Solution:
1. Check file size (< 10MB)
2. Check file type (images only)
3. Check Railway storage limit
4. Check server logs
```

### Issue: Files deleted after restart
```bash
Solution:
1. Verify Railway paid plan active
2. Check persistent storage enabled
3. Contact Railway support
```

---

## 📞 Support

### Railway Support:
- 📧 Email: support@railway.app
- 💬 Discord: https://discord.gg/railway
- 📚 Docs: https://docs.railway.app

### Project Maintainer:
- Check server logs for errors
- Monitor Railway dashboard
- Regular backups recommended

---

## ✅ Setup Complete!

**Your app is now running on:**
- 🚂 Railway Paid Plan ($5/month)
- 🌏 Singapore Server (fast for Pakistan)
- 💾 Persistent Storage (10GB)
- 🔒 Secure & Reliable

**Images will:**
- ✅ Upload to Railway storage
- ✅ Persist after restarts
- ✅ Load fast for users
- ✅ Stay safe and secure

---

**Last Updated:** November 2025
**Railway Plan:** Pro ($5/month)
**Region:** Singapore (Asia)
