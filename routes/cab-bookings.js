const express = require('express');
const router = express.Router();
const cabBookingsController = require('../controllers/cabBookingsController');
const auth = require('../middleware/auth');

// Create a new cab booking
router.post('/create', auth.protect, cabBookingsController.createBooking);

// Driver submits fare offer (no auth required - drivers submit from notification flow)
router.post('/submit-offer', cabBookingsController.submitFareOffer);

// Accept driver's offer
router.put('/accept-offer', auth.protect, cabBookingsController.acceptOffer);

// Driver arrived at pickup location
router.put('/driver-arrival', auth.protect, cabBookingsController.driverArrival);

// Start journey
router.put('/start-journey', auth.protect, cabBookingsController.startJourney);

// Complete journey
router.put('/complete-journey', auth.protect, cabBookingsController.completeJourney);

// Complete booking (alternative route for POST requests)
router.post('/complete', auth.protect, cabBookingsController.completeJourney);

// Get booking history for a user
router.get('/user-history/:userId', auth.protect, cabBookingsController.getUserBookingHistory);

// Get user bookings with driver offers (for user profile proposals tab - no auth for notification flow)
router.get('/user-bookings/:userId', cabBookingsController.getUserBookingsWithOffers);

// Get booking history for a driver (no auth - drivers access from profile)
router.get('/driver-history/:driverId', cabBookingsController.getDriverBookingHistory);

// Get pending bookings for a driver
router.get('/driver-pending/:driverId', auth.protect, cabBookingsController.getDriverPendingBookings);

// Get booking details (no auth required - drivers need to access via notification)
router.get('/:bookingId', cabBookingsController.getBookingDetails);

// Get all driver offers for a booking (no auth required - users need to see proposals)
router.get('/:bookingId/offers', cabBookingsController.getBookingOffers);

// Accept a driver's offer (no auth required - users accept from notification modal)
router.put('/:bookingId/accept', cabBookingsController.acceptDriverOffer);

module.exports = router;
