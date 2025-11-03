# Chat Upload Testing Guide

## ✅ Changes Implemented

### Backend: `routes/chat.js`
- ✅ Multer configuration for image & audio upload
- ✅ Upload directories: `uploads/chat/images/` & `uploads/chat/audio/`
- ✅ New endpoint: `POST /api/chat/upload`
- ✅ File validation (images: jpg, png, gif, webp | audio: mp3, m4a, aac, wav, ogg)
- ✅ 10MB file size limit

### Frontend: Flutter
- ✅ ChatService: `uploadFile()` & `sendMediaMessage()` methods
- ✅ Chat Screen: Image upload from gallery/camera
- ✅ Chat Screen: Voice recording with flutter_sound
- ✅ Chat Screen: Audio playback
- ✅ Chat List: Media preview icons

---

## 🧪 Testing the Upload Endpoint

### Using Postman/Thunder Client:

**Endpoint:** `POST http://your-backend-url/api/chat/upload`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body (form-data):**
- Key: `file` (File type)
- Value: [Select your image or audio file]
- Key: `fileType` (Text type)  
- Value: `image` or `audio`

**Expected Response (Success):**
```json
{
  "success": true,
  "fileUrl": "uploads/chat/images/image_1699123456789.jpg",
  "message": "File uploaded successfully"
}
```

**Expected Response (Error):**
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

---

## 📁 File Structure

```
backend/
├── uploads/
│   └── chat/
│       ├── images/
│       │   └── image_1699123456.jpg
│       └── audio/
│           └── audio_1699123457.m4a
```

---

## 🔗 Full Upload & Send Flow

### 1. Upload File
```bash
POST /api/chat/upload
Body: file + fileType
Response: { fileUrl: "uploads/chat/images/..." }
```

### 2. Send Message with Media
```bash
POST /api/chat/conversation/:id/message
Body: {
  "messageText": "📷 Photo caption",
  "messageType": "image",
  "mediaUrl": "uploads/chat/images/image_123.jpg"
}
```

---

## 🎯 Frontend Testing Steps

### Test Image Upload:
1. Open chat screen
2. Tap attachment icon
3. Select "Gallery" or camera icon
4. Choose/capture image
5. Add optional caption
6. Tap "Send Photo"
7. ✅ Image should upload and appear in chat
8. ✅ Inbox should show "📷 Photo" with icon

### Test Voice Recording:
1. Open chat screen
2. Tap microphone icon (when text field is empty)
3. Record for few seconds
4. Tap stop button
5. ✅ Voice message should upload
6. ✅ Inbox should show "🎤 Voice message" with icon
7. ✅ Tap voice message to play

---

## ⚠️ Common Issues & Solutions

### Issue: 404 Error on Upload
**Cause:** Backend not running or wrong URL
**Fix:** Ensure backend server is running on correct port

### Issue: "No file uploaded" Error
**Cause:** `file` field name mismatch
**Fix:** Ensure form-data uses key name `file` (not `image` or `audio`)

### Issue: Voice recording fails
**Cause:** Microphone permission not granted
**Fix:** Enable microphone permission in app settings

### Issue: Audio doesn't play
**Cause:** File not accessible or wrong URL
**Fix:** Check file exists at returned URL (open in browser)

### Issue: Large files fail
**Cause:** File size > 10MB
**Fix:** Compress file or increase limit in chat.js

---

## 🔒 Security Checklist

- [x] Authentication required for upload
- [x] File type validation (only images & audio)
- [x] File size limit (10MB)
- [x] Unique filenames (timestamp-based)
- [x] Safe file extensions only
- [x] Files stored outside web root (good)

---

## 📊 Database Schema

Messages table already has these fields:
```sql
message_text    VARCHAR    -- "📷 Photo" or "🎤 Voice message"
message_type    VARCHAR    -- "image" or "audio" 
media_url       VARCHAR    -- "uploads/chat/images/image_123.jpg"
```

No database changes needed! ✅

---

## 🚀 Deployment Notes

### Production Considerations:
1. **CDN/Cloud Storage:** Use AWS S3 or similar for production
2. **HTTPS:** Ensure backend uses HTTPS for secure uploads
3. **CORS:** Configure properly for your domain
4. **Rate Limiting:** Add rate limiting for upload endpoint
5. **Virus Scanning:** Consider adding antivirus scanning
6. **Backup:** Regular backup of uploads directory

---

## 📝 Testing Checklist

### Backend:
- [ ] `/api/chat/upload` endpoint responds
- [ ] Images upload successfully
- [ ] Audio files upload successfully
- [ ] Invalid files rejected
- [ ] File size limit enforced
- [ ] Files accessible via direct URL
- [ ] Authentication required

### Frontend:
- [ ] Gallery image upload works
- [ ] Camera image capture works
- [ ] Voice recording works
- [ ] Voice playback works
- [ ] Upload progress shown
- [ ] Success/error messages display
- [ ] Inbox preview correct

---

**Last Updated:** November 3, 2024  
**Status:** ✅ Ready for Testing
