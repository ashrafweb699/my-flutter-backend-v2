const express = require('express');
const router = express.Router();
const serviceUnitsCtrl = require('../controllers/serviceUnitsController');
const auth = require('../middleware/auth');

// Public routes
router.get('/units', serviceUnitsCtrl.getServiceUnits);
router.get('/units/all', serviceUnitsCtrl.getAllServiceUnits); // Public for now

// Admin routes (protected)
// TODO: Enable auth.adminAuth when admin login is properly configured
router.post('/units', auth.protect, serviceUnitsCtrl.createServiceUnit);
router.put('/units/:id', auth.protect, serviceUnitsCtrl.updateServiceUnit);
router.delete('/units/:id', auth.protect, serviceUnitsCtrl.deleteServiceUnit);
router.patch('/units/:id/toggle', auth.protect, serviceUnitsCtrl.toggleServiceUnitStatus);

module.exports = router;
