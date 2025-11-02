const express = require('express');
const router = express.Router();
const advertisementsController = require('../controllers/advertisementsController');
const upload = require('../utils/upload');

// GET all advertisements
router.get('/', advertisementsController.getAllAdvertisements);

// GET a single advertisement by ID
router.get('/:id', advertisementsController.getAdvertisementById);

// POST create a new advertisement with optional image upload
router.post('/', upload.single('image'), advertisementsController.createAdvertisement);

// PUT update an advertisement with optional image upload
router.put('/:id', upload.single('image'), advertisementsController.updateAdvertisement);

// DELETE an advertisement (soft delete)
router.delete('/:id', advertisementsController.deleteAdvertisement);

module.exports = router; 