const express = require('express');
const router = express.Router();
const shopkeepersController = require('../controllers/shopkeepersController');

// GET all shopkeepers
router.get('/', shopkeepersController.getAllShopkeepers);

// GET a specific shopkeeper
router.get('/:id', shopkeepersController.getShopkeeperById);

// POST create a new shopkeeper
router.post('/', shopkeepersController.createShopkeeper);

// PUT update a shopkeeper
router.put('/:id', shopkeepersController.updateShopkeeper);

// PATCH update shopkeeper approval status
router.patch('/:id/approval', shopkeepersController.updateShopkeeperApproval);

// DELETE a shopkeeper
router.delete('/:id', shopkeepersController.deleteShopkeeper);

module.exports = router;
