# 🚀 Railway MySQL Setup Guide

## ✅ Database Connection Details

Aapka Railway MySQL database ready hai:

```
Host: nozomi.proxy.rlwy.net
Port: 38997
User: root
Password: ETHcerGPYmLeqpXUhBYmsvIQCrKWrBsF
Database: railway
```

## 📋 Setup Steps

### Step 1: Copy Environment File

Railway configuration file `.env.railway` already create ho gayi hai. Ab isko `.env` ke naam se copy karein:

**PowerShell Command:**
```powershell
cd c:\Projects\gwadar_online_bazaar\backend
Copy-Item .env.railway .env
```

**Or manually:**
1. `.env.railway` file ko copy karein
2. Uska naam `.env` rakhein

### Step 2: Test Database Connection

Backend server start karein aur database connection test karein:

```powershell
cd c:\Projects\gwadar_online_bazaar\backend
npm start
```

Agar connection successful hai, toh aapko yeh message dikhayi dega:
```
✅ Database connection established successfully
```

### Step 3: Database Tables Setup

Server start hone par automatically tables create ho jayenge:
- `users`
- `drivers`
- `categories`
- `products`
- `services`
- `orders`
- `bookings`
- And all other tables...

Migrations automatically run hote hain `server.js` mein.

## 🔧 Railway Dashboard Configuration

Railway dashboard mein environment variables set karein:

### Method 1: Individual Variables (Recommended)

```env
PORT=3000
NODE_ENV=production
DB_HOST=nozomi.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=ETHcerGPYmLeqpXUhBYmsvIQCrKWrBsF
DB_NAME=railway
DB_PORT=38997
JWT_SECRET=gwadar_online_bazaar_secret_key_2024_railway_deployment
CLIENT_URL=*
UPLOAD_DIR=./uploads
```

### Method 2: Using Railway Variables (Alternative)

Railway automatically provides MySQL variables. Aap unhe bhi use kar sakte hain:

```env
PORT=3000
NODE_ENV=production
DB_HOST=${{MYSQLHOST}}
DB_USER=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}
DB_NAME=${{MYSQLDATABASE}}
DB_PORT=${{MYSQLPORT}}
JWT_SECRET=gwadar_online_bazaar_secret_key_2024_railway_deployment
CLIENT_URL=*
UPLOAD_DIR=./uploads
```

## 🧪 Testing Connection

### Test 1: Local Connection Test

```powershell
cd c:\Projects\gwadar_online_bazaar\backend
npm start
```

Expected output:
```
✅ Database connection established successfully
✅ Server is running on port 3000
```

### Test 2: MySQL Command Line Test

```bash
mysql -h nozomi.proxy.rlwy.net -u root -p ETHcerGPYmLeqpXUhBYmsvIQCrKWrBsF --port 38997 railway
```

### Test 3: API Test (After Server Start)

```bash
# Health check
curl http://localhost:3000/

# Categories API
curl http://localhost:3000/api/categories
```

## 📊 Database Management

### Connect via MySQL Workbench

1. Open MySQL Workbench
2. New Connection:
   - **Connection Name:** Railway - Gwadar Bazaar
   - **Hostname:** nozomi.proxy.rlwy.net
   - **Port:** 38997
   - **Username:** root
   - **Password:** ETHcerGPYmLeqpXUhBYmsvIQCrKWrBsF
   - **Default Schema:** railway

### Connect via Railway CLI

```bash
railway connect MySQL
```

Yeh automatically connection open kar dega.

## 🔐 Security Notes

### Important:
1. ❌ `.env` file ko GitHub par upload na karein
2. ✅ `.env.railway` file reference ke liye hai
3. ✅ Railway dashboard mein environment variables set karein
4. ✅ Password ko secure rakhein

### .gitignore Check:
`.env` file already `.gitignore` mein hai, so it won't be uploaded to GitHub.

## 🚀 Deployment to Railway

### Step 1: GitHub Upload

```bash
cd c:\Projects\gwadar_online_bazaar\backend
git add .
git commit -m "Backend ready for Railway deployment"
git push
```

### Step 2: Railway Project Setup

1. Railway.app → New Project
2. Deploy from GitHub repo
3. Select your backend repository
4. Railway automatically detect karega Node.js app

### Step 3: Environment Variables

Railway dashboard mein Variables tab mein jaayen aur add karein:

```env
PORT=3000
NODE_ENV=production
DB_HOST=nozomi.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=ETHcerGPYmLeqpXUhBYmsvIQCrKWrBsF
DB_NAME=railway
DB_PORT=38997
JWT_SECRET=gwadar_online_bazaar_secret_key_2024_railway_deployment
CLIENT_URL=*
```

### Step 4: Deploy

Railway automatically deploy kar dega. Deployment logs check karein.

## ✅ Verification Checklist

- [ ] `.env` file created from `.env.railway`
- [ ] Local server starts successfully
- [ ] Database connection successful
- [ ] Tables created automatically
- [ ] API endpoints working
- [ ] GitHub repository updated
- [ ] Railway project created
- [ ] Environment variables set in Railway
- [ ] Deployment successful
- [ ] Production API working

## 🆘 Troubleshooting

### Issue: Connection Timeout
**Solution:** Check if your IP is whitelisted in Railway (usually not needed for public network)

### Issue: Authentication Failed
**Solution:** Double-check password in `.env` file

### Issue: Database Not Found
**Solution:** Ensure database name is `railway` (lowercase)

### Issue: Tables Not Created
**Solution:** Check server logs for migration errors

### Issue: Port Already in Use
**Solution:** 
```powershell
# Kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

## 📞 Next Steps

1. ✅ Database connection ready
2. ➡️ Copy `.env.railway` to `.env`
3. ➡️ Start server locally: `npm start`
4. ➡️ Test APIs
5. ➡️ Deploy to Railway
6. ➡️ Update Flutter app with Railway URL

---

**Database Status:** ✅ Connected and Ready
**Railway MySQL:** ✅ Public Network Access
**Backend:** ✅ Ready for Deployment
