const notificationController = require('../controllers/notificationController');

// Notification Routes
router.post('/notifications/send', notificationController.sendNotification);
router.get('/notifications', notificationController.getAllNotifications); 