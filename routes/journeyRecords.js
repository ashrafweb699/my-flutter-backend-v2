const express = require('express');
const router = express.Router();
const journeyRecordsController = require('../controllers/journeyRecordsController');

// Complete journey and reset seats
router.post('/complete', journeyRecordsController.completeJourney);

// Get journey records for a bus manager
router.get('/manager/:bus_manager_id', journeyRecordsController.getJourneyRecords);

// Get journey statistics
router.get('/manager/:bus_manager_id/stats', journeyRecordsController.getJourneyStats);

module.exports = router;
