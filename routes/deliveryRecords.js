const express = require('express');
const router = express.Router();
const deliveryRecordsController = require('../controllers/deliveryRecordsController');

// Get delivery records for a delivery boy (from orders table)
router.get('/delivery-boy/:delivery_boy_id', deliveryRecordsController.getDeliveryRecords);

// Get statistics for delivery boy (from orders table)
router.get('/statistics/:delivery_boy_id', deliveryRecordsController.getDeliveryBoyStatistics);

module.exports = router;
