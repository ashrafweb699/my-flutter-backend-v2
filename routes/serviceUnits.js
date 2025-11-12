const express = require('express');
const router = express.Router();
const serviceUnitsCtrl = require('../controllers/serviceUnitsController');
const auth = require('../middleware/auth');

// Public routes
router.get('/units', serviceUnitsCtrl.getServiceUnits);
router.get('/units/all', serviceUnitsCtrl.getAllServiceUnits); // Public for now

// Admin routes (temporarily public for testing)
// TODO: Add auth.protect or auth.adminAuth when admin login is properly configured
router.post('/units', serviceUnitsCtrl.createServiceUnit);
router.put('/units/:id', serviceUnitsCtrl.updateServiceUnit);
router.delete('/units/:id', serviceUnitsCtrl.deleteServiceUnit);
router.patch('/units/:id/toggle', serviceUnitsCtrl.toggleServiceUnitStatus);

module.exports = router;
