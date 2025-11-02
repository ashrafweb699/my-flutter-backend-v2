# 🚀 Quick Reference Card

## GitHub Upload (5 Minutes)

```bash
cd c:\Projects\gwadar_online_bazaar\backend
git init
git add .
git commit -m "Initial backend setup"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Railway Deployment (10 Minutes)

1. **Railway.app** → Sign in with GitHub
2. **New Project** → Deploy from GitHub repo
3. **Add Database** → MySQL
4. **Variables** → Add these:
   - `JWT_SECRET` = (random strong string)
   - `CLIENT_URL` = `*`
5. **Deploy** → Automatic!

## Environment Variables Template

```env
PORT=3000
NODE_ENV=production
DB_HOST=${{MYSQLHOST}}
DB_USER=${{MYSQLUSER}}
DB_PASSWORD=${{MYSQLPASSWORD}}
DB_NAME=${{MYSQLDATABASE}}
DB_PORT=${{MYSQLPORT}}
JWT_SECRET=your_secret_here
CLIENT_URL=*
```

## Flutter App Update

File: `lib/config/app_config.dart`

```dart
static const String _productionUrl = 'your-app.railway.app';
static const String _wifiRouterPort = '3000';
```

## Testing Commands

```bash
# Local
npm install
npm start

# Production
curl https://your-app.railway.app/
curl https://your-app.railway.app/api/categories
```

## Important Files

- ✅ `.env.example` - Environment template
- ✅ `.gitignore` - Security protection
- ✅ `RAILWAY_DEPLOYMENT_GUIDE.md` - Full guide
- ✅ `GITHUB_SETUP.md` - GitHub guide
- ✅ `DEPLOYMENT_SUMMARY.md` - Complete summary

## Security Checklist

- ❌ Never upload `.env` to GitHub
- ❌ Never upload `node_modules/`
- ❌ Never upload Firebase credentials
- ✅ Always use `.gitignore`
- ✅ Always use strong `JWT_SECRET`

## Common Issues

**GitHub Permission Denied:**
→ Use Personal Access Token instead of password

**Railway Database Connection Failed:**
→ Check environment variables in Railway dashboard

**CORS Error:**
→ Set `CLIENT_URL` properly in Railway variables

**Port Already in Use:**
→ Railway handles PORT automatically

## Support

- Railway: https://docs.railway.app
- GitHub: https://docs.github.com
- Full guides in backend folder

---

**Ready to Deploy? Follow RAILWAY_DEPLOYMENT_GUIDE.md** 🚀
