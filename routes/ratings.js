const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratingsController');
const auth = require('../middleware/auth');

// Create a new rating
router.post('/create', auth.protect, ratingsController.createRating);

// Get average rating for a user
router.get('/average/:userId', ratingsController.getAverageRating);

// Get rating history for a user
router.get('/history/:userId', auth.protect, ratingsController.getRatingHistory);

module.exports = router;
