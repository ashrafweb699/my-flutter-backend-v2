const express = require('express');
const orderTrackingController = require('../controllers/orderTrackingController');

module.exports = (io) => {
  const router = express.Router();

  // Order tracking routes
  router.get('/order-tracking/:orderId', orderTrackingController.getOrderTracking);
  router.put('/order-tracking/:orderId/location', (req, res) => orderTrackingController.updateOrderLocation(req, res, io));

  // Notification routes
  router.get('/notifications/:userId', orderTrackingController.getUserNotifications);
  router.put('/notifications/:notificationId/read', orderTrackingController.markNotificationAsRead);
  router.post('/notifications', orderTrackingController.createNotification);

  // Order status routes
  router.put('/orders/:orderId/status', (req, res) => orderTrackingController.updateOrderStatus(req, res, io));
  router.get('/orders/:orderId/status-history', orderTrackingController.getOrderStatusHistory);

  // Driver location routes
  router.get('/drivers/locations', orderTrackingController.getDriverLocations);

  return router;
};
