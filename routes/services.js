const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/servicesController');
const upload = require('../utils/upload');

// GET all services
router.get('/', servicesController.getAllServices);

// GET a single service by ID
router.get('/:id', servicesController.getServiceById);

// POST create a new service with optional image upload
router.post('/', upload.single('image'), servicesController.createService);

// PUT update a service with optional image upload
router.put('/:id', upload.single('image'), servicesController.updateService);

// DELETE a service (soft delete)
router.delete('/:id', servicesController.deleteService);

// PUT update services display order
router.put('/order/update', servicesController.updateServicesOrder);

module.exports = router;