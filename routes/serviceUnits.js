const express = require('express');
const router = express.Router();
const serviceUnitsCtrl = require('../controllers/serviceUnitsController');
const auth = require('../middleware/auth');

// Public routes
router.get('/units', serviceUnitsCtrl.getServiceUnits);

// Admin routes
router.get('/units/all', auth.adminAuth, serviceUnitsCtrl.getAllServiceUnits);
router.post('/units', auth.adminAuth, serviceUnitsCtrl.createServiceUnit);
router.put('/units/:id', auth.adminAuth, serviceUnitsCtrl.updateServiceUnit);
router.delete('/units/:id', auth.adminAuth, serviceUnitsCtrl.deleteServiceUnit);
router.patch('/units/:id/toggle', auth.adminAuth, serviceUnitsCtrl.toggleServiceUnitStatus);

module.exports = router;
