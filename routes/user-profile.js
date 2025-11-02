const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const userProfileController = require('../controllers/userProfileController');
const { protect } = require('../middleware/auth');

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    console.log('📋 File upload attempt:');
    console.log('  - Original name:', file.originalname);
    console.log('  - Mimetype:', file.mimetype);
    console.log('  - Extension:', path.extname(file.originalname).toLowerCase());
    
    // Accept all image types - more lenient validation
    if (file.mimetype.startsWith('image/')) {
      console.log('✅ File accepted (image type)');
      return cb(null, true);
    }
    
    // Also check extension as fallback
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
      console.log('✅ File accepted (valid extension)');
      return cb(null, true);
    }
    
    console.log('❌ File rejected - not an image');
    cb(new Error('Only image files are allowed!'));
  }
});

// All routes require authentication
router.get('/profile', protect, userProfileController.getUserProfile);
router.put('/profile', protect, userProfileController.updateUserProfile);
router.post('/upload-image', protect, upload.single('image'), userProfileController.uploadProfileImage);

module.exports = router;
