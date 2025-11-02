# 📦 GitHub Setup Guide

## Step 1: Create GitHub Repository

1. GitHub par jaayen: https://github.com
2. "New repository" click karein
3. Repository details:
   - **Name:** `gwadar-backend` (ya koi bhi naam)
   - **Description:** Backend API for Gwadar Online Bazaar
   - **Visibility:** Private (recommended) ya Public
   - **DO NOT** initialize with README, .gitignore, or license (already hai)

## Step 2: Backend Ko GitHub Par Upload Karein

PowerShell ya Command Prompt mein backend folder mein jaayen:

```powershell
cd c:\Projects\gwadar_online_bazaar\backend
```

### Initialize Git Repository

```bash
git init
```

### Add All Files

```bash
git add .
```

### Create First Commit

```bash
git commit -m "Initial backend setup for Railway deployment"
```

### Add GitHub Remote

Replace `YOUR_USERNAME` and `REPOSITORY_NAME` with your actual values:

```bash
git remote add origin https://github.com/YOUR_USERNAME/REPOSITORY_NAME.git
```

Example:
```bash
git remote add origin https://github.com/ahmadali/gwadar-backend.git
```

### Push to GitHub

```bash
git branch -M main
git push -u origin main
```

### Enter Credentials

Agar GitHub credentials maange, toh:
- **Username:** Apna GitHub username
- **Password:** Personal Access Token (PAT) use karein

**Personal Access Token kaise banayein:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" click karein
3. Scopes select karein: `repo` (full control)
4. Token copy karein aur safe rakhein

## Step 3: Verify Upload

1. GitHub repository page par jaayen
2. Files check karein:
   - ✅ `server.js`
   - ✅ `package.json`
   - ✅ `.env.example`
   - ✅ `.gitignore`
   - ✅ `config/`, `routes/`, `db/` folders
   - ❌ `.env` file (yeh nahi honi chahiye - gitignore mein hai)
   - ❌ `node_modules/` (yeh bhi nahi honi chahiye)

## Step 4: Future Updates

Jab bhi code update karein:

```bash
git add .
git commit -m "Description of changes"
git push
```

## ⚠️ Important Security Notes

### Files Jo GitHub Par NAHI Honi Chahiye:

- ❌ `.env` file (database passwords, secrets)
- ❌ `node_modules/` folder
- ❌ `firebase-service-account.json`
- ❌ Any file with passwords or API keys

### Files Jo GitHub Par Honi Chahiye:

- ✅ `.env.example` (template without actual values)
- ✅ `.gitignore` (to exclude sensitive files)
- ✅ All source code files
- ✅ `package.json` and `package-lock.json`

## 🔐 Protecting Sensitive Information

Agar galti se `.env` file push ho gayi:

1. **Immediately** change all passwords and secrets
2. Remove file from Git history:
```bash
git rm --cached .env
git commit -m "Remove .env file"
git push
```

## Next Steps

After GitHub upload:
1. ✅ Backend GitHub par hai
2. ➡️ Railway deployment karein (see RAILWAY_DEPLOYMENT_GUIDE.md)
3. ➡️ Flutter app mein production URL update karein

---

## 🆘 Common Issues

### Issue: "Permission denied"
**Solution:** Personal Access Token use karein password ke bajaye

### Issue: "Repository not found"
**Solution:** Repository URL check karein, aur ensure karein ke repository create ho gayi hai

### Issue: ".env file visible on GitHub"
**Solution:** 
```bash
git rm --cached .env
git commit -m "Remove .env"
git push
```

### Issue: "Large files error"
**Solution:** `node_modules/` aur `uploads/` folders `.gitignore` mein hain, check karein

---

## 📞 Need Help?

GitHub Docs: https://docs.github.com
Git Basics: https://git-scm.com/book/en/v2/Getting-Started-Git-Basics
