const express = require('express');
const router = express.Router();
const callNotificationController = require('../controllers/callNotificationController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Send call notification
router.post('/send', callNotificationController.sendCallNotification);

// Cancel call notification
router.post('/cancel', callNotificationController.cancelCallNotification);

// Update call status
router.post('/status', callNotificationController.updateCallStatus);

module.exports = router;
