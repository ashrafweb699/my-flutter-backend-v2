# 🚀 Railway Deployment Guide - Gwadar Online Bazaar Backend

## ✅ Pre-Deployment Checklist

Yeh sab changes already kar diye gaye hain:

- ✅ PORT configuration updated (3000)
- ✅ CORS configuration improved for production
- ✅ Environment variables properly configured
- ✅ `.gitignore` file created
- ✅ `.env.example` file created
- ✅ `package.json` has correct start script

## 📋 Step-by-Step Railway Deployment

### Step 1: GitHub Repository Setup

1. **Backend folder ko GitHub par upload karein:**

```bash
cd backend
git init
git add .
git commit -m "Initial backend setup for Railway deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gwadar-backend.git
git push -u origin main
```

**Note:** Apna GitHub username aur repository name use karein.

### Step 2: Railway Account Setup

1. Railway.app par jaayen: https://railway.app
2. GitHub account se sign up/login karein
3. "New Project" click karein
4. "Deploy from GitHub repo" select karein
5. Apni backend repository select karein

### Step 3: MySQL Database Setup on Railway

1. Railway dashboard mein, "New" → "Database" → "Add MySQL" click karein
2. MySQL database automatically create ho jayega
3. Database ke environment variables automatically mil jayenge:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`

### Step 4: Environment Variables Configuration

Railway dashboard mein apne backend service par click karein, phir "Variables" tab mein jaayen:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration (Railway automatically provides these)
DB_HOST=${{MYSQLHOST}}
DB_USER=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}
DB_NAME=${{MYSQLDATABASE}}
DB_PORT=${{MYSQLPORT}}

# JWT Secret (Strong random string generate karein)
JWT_SECRET=your_super_secret_jwt_key_here_change_this

# Client URL (Apni Flutter app ka URL - development ke liye * rakh sakte hain)
CLIENT_URL=*

# Upload Directory
UPLOAD_DIR=./uploads
```

**Important Notes:**
- `JWT_SECRET` ko strong random string se replace karein
- Railway automatically MySQL variables provide karta hai
- `CLIENT_URL` ko production mein apni actual frontend URL se replace karein

### Step 5: Deploy!

1. Railway automatically deploy kar dega
2. Deployment logs check karein
3. Successful deployment ke baad, aapko ek URL milega: `https://your-app.railway.app`

### Step 6: Database Tables Setup

Railway par first deployment ke baad, database tables automatically create ho jayenge kyunki:
- Server start hone par migrations automatically run hote hain
- `server.js` mein `runMigrations()` function hai

### Step 7: Flutter App Configuration

Apni Flutter app mein `lib/config/app_config.dart` update karein:

```dart
static const String _productionUrl = 'your-app.railway.app'; // Railway URL (without https://)
```

## 🔧 Important Railway Settings

### Root Directory
Agar aap pura project upload kar rahe hain (Flutter + Backend), toh:
1. Railway dashboard → Settings → "Root Directory" → `backend` set karein

### Build Command (Optional)
Railway automatically detect kar leta hai, but manually set karne ke liye:
```bash
npm install
```

### Start Command
```bash
npm start
```

## ⚠️ Important Notes for Railway

### 1. File Uploads Issue
Railway ephemeral filesystem use karta hai, matlab uploaded files restart ke baad delete ho jayengi.

**Solution:**
- Cloudinary, AWS S3, ya Railway Volumes use karein for persistent storage
- Ya Firebase Storage use karein (recommended for your app)

### 2. Database Connection
- Railway MySQL automatically configure ho jata hai
- Connection pooling already implemented hai `config/db.js` mein

### 3. Environment Variables
- Kabhi bhi `.env` file GitHub par upload na karein
- Sensitive information sirf Railway dashboard mein add karein

## 🧪 Testing Your Deployment

1. **Health Check:**
```bash
curl https://your-app.railway.app/
```

2. **API Test:**
```bash
curl https://your-app.railway.app/api/categories
```

3. **Flutter App Test:**
   - `app_config.dart` mein production URL set karein
   - App run karein aur test karein

## 📊 Monitoring

Railway dashboard mein:
- **Logs:** Real-time logs dekh sakte hain
- **Metrics:** CPU, Memory usage monitor kar sakte hain
- **Deployments:** Previous deployments dekh sakte hain

## 🔄 Re-deployment

Code update karne ke baad:

```bash
git add .
git commit -m "Your update message"
git push
```

Railway automatically detect karke re-deploy kar dega!

## 🆘 Common Issues & Solutions

### Issue 1: Database Connection Failed
**Solution:** Railway dashboard mein database variables check karein

### Issue 2: Port Already in Use
**Solution:** Railway automatically PORT set karta hai, manual configuration ki zarurat nahi

### Issue 3: Uploads Not Working
**Solution:** Railway volumes use karein ya cloud storage (Cloudinary/S3/Firebase)

### Issue 4: CORS Error
**Solution:** `CLIENT_URL` environment variable properly set karein

## 📞 Support

Railway documentation: https://docs.railway.app
Railway Discord: https://discord.gg/railway

---

## 🎉 Deployment Complete!

Aapka backend ab live hai! 🚀

Railway URL: `https://your-app.railway.app`

Next steps:
1. Flutter app mein production URL update karein
2. Testing karein
3. Users ko share karein!
