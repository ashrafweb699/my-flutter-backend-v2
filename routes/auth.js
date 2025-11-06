const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (require authentication)
router.get('/me', protect, authController.getMe);
router.get('/approval-status', protect, authController.getApprovalStatus);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/change-password', protect, authController.changePassword);
router.put('/clear-fcm-token', protect, authController.clearFcmToken);
router.put('/update-fcm', protect, authController.updateFcmToken);

module.exports = router;
