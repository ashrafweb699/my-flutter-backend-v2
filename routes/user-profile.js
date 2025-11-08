const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');
const { protect } = require('../middleware/auth');
const { uploadProfile } = require('../config/cloudinary');

// All routes require authentication
router.get('/profile', protect, userProfileController.getUserProfile);
router.put('/profile', protect, userProfileController.updateUserProfile);
router.post('/upload-image', protect, uploadProfile.single('image'), userProfileController.uploadProfileImage);

module.exports = router;
