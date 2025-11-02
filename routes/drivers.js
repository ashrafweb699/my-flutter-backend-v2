const express = require('express');
const router = express.Router();
const driversController = require('../controllers/driversController');

// GET all drivers
router.get('/', driversController.getAllDrivers);

// GET check driver email status
router.get('/check-email', driversController.checkDriverEmail);

// GET driver by user_id (must be before /:id to avoid conflict)
router.get('/by-user/:userId', driversController.getDriverByUserId);

// GET a specific driver
router.get('/:id', driversController.getDriverById);

// POST create a new driver
router.post('/', driversController.createDriver);

// POST login driver
router.post('/login', driversController.loginDriver);

// PUT update a driver
router.put('/:id', driversController.updateDriver);

// PATCH update driver approval status
router.patch('/:id/approval', driversController.updateDriverApproval);

// POST update driver FCM token
router.post('/:id/token', driversController.updateDriverToken);

// PUT update driver online status
router.put('/:id/status', driversController.updateDriverStatus);

// DELETE a driver
router.delete('/:id', driversController.deleteDriver);

// Add new routes for Firebase fallback
// GET ping endpoint for connectivity checks
router.get('/ping', driversController.pingServer);

// POST update driver location
router.post('/location/update', driversController.updateDriverLocation);

// POST mark driver as offline
router.post('/offline', driversController.setDriverOffline);

// Update driver password
router.put('/password/:id', driversController.updateDriverPassword);

// Fix drivers with empty approval status (admin only)
router.get('/fix-approval-status', driversController.fixDriversApprovalStatus);

module.exports = router; 