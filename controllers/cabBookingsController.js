const db = require('../db/connection');
const { sendNotification } = require('../utils/notifications');

const cabBookingsController = {
  // Create a new cab booking
  createBooking: async (req, res) => {
    try {
      const { 
        user_id, 
        user_name,
        user_phone,
        pickup_latitude,
        pickup_longitude,
        destination_latitude,
        destination_longitude,
        pickup_address,
        destination_address,
        persons,
        status
      } = req.body;
      
      // Validate input
      if (!user_id || !pickup_latitude || !pickup_longitude || 
          !destination_latitude || !destination_longitude) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Generate unique booking ID
      const bookingId = `CAB${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Debug log to see what addresses are being saved
      console.log('📍 Pickup Address:', pickup_address);
      console.log('🎯 Destination Address:', destination_address);
      
      // Insert booking
      const [result] = await db.execute(
        `INSERT INTO cab_bookings 
         (booking_id, user_id, user_name, user_phone, pickup_latitude, pickup_longitude, 
          destination_latitude, destination_longitude, 
          pickup_address, destination_address, passenger_count, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingId,
          user_id, 
          user_name,
          user_phone,
          pickup_latitude,
          pickup_longitude,
          destination_latitude,
          destination_longitude,
          pickup_address || 'Unknown Pickup',
          destination_address || 'Unknown Destination',
          persons,
          status || 'requested'
        ]
      );
      
      // Get online drivers with their FCM tokens from users table
      const [drivers] = await db.execute(
        `SELECT d.id, u.fcm_token 
         FROM drivers d 
         JOIN users u ON d.user_id = u.id 
         WHERE d.online_status = 'online' 
         AND u.fcm_token IS NOT NULL`
      );
      
      console.log(`✅ Booking created: ${bookingId} (DB ID: ${result.insertId})`);
      console.log(`📢 Notifying ${drivers.length} online drivers...`);
      
      // Send notification to online drivers
      for (const driver of drivers) {
        if (driver.fcm_token) {
          try {
            await sendNotification({
              token: driver.fcm_token,
              title: '🚕 Nayi Ride Request!',
              body: `${user_name} ride chahta hai\nPickup: ${pickup_address || 'Location selected'}`,
              data: {
                type: 'new_booking',
                booking_id: bookingId,
                db_booking_id: result.insertId.toString(),
                user_name: user_name,
                pickup_address: pickup_address || '',
                destination_address: destination_address || '',
                screen: 'cab_request'
              }
            });
            console.log(`   ✅ Notified driver ${driver.id}`);
          } catch (notifyErr) {
            console.log(`   ⚠️ Failed to notify driver ${driver.id}: ${notifyErr.message}`);
          }
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking_id: result.insertId.toString(),
        booking_ref: bookingId
      });
      
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  },
  
  // Driver submits fare offer
  submitFareOffer: async (req, res) => {
    try {
      const { 
        booking_id, 
        driver_id, 
        proposed_fare,
        driver_name,
        driver_phone,
        vehicle_type,
        vehicle_number
      } = req.body;
      
      console.log(`📤 Driver ${driver_id} submitting fare offer Rs.${proposed_fare} for booking ${booking_id}`);
      
      // Validate input
      if (!booking_id || !driver_id || !proposed_fare) {
        return res.status(400).json({ error: 'Missing required fields: booking_id, driver_id, proposed_fare' });
      }
      
      // Check if booking exists
      const [bookingCheck] = await db.execute(
        `SELECT id, user_id, status FROM cab_bookings WHERE id = ?`,
        [booking_id]
      );
      
      if (bookingCheck.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const currentBooking = bookingCheck[0];
      
      // Don't allow offers if booking is already accepted
      if (currentBooking.status === 'accepted') {
        return res.status(400).json({ error: 'Booking already accepted by another driver' });
      }
      
      // Insert or update driver offer in cab_driver_offers table
      const [insertResult] = await db.execute(
        `INSERT INTO cab_driver_offers 
         (booking_id, driver_id, driver_name, driver_phone, vehicle_type, vehicle_number, proposed_fare, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
         ON DUPLICATE KEY UPDATE
         proposed_fare = VALUES(proposed_fare),
         vehicle_type = VALUES(vehicle_type),
         vehicle_number = VALUES(vehicle_number),
         offered_at = CURRENT_TIMESTAMP`,
        [booking_id, driver_id, driver_name, driver_phone, vehicle_type, vehicle_number, proposed_fare]
      );
      
      console.log(`✅ Driver ${driver_id} offer saved for booking ${booking_id}`);
      
      // Get user details to send notification
      const [bookingRows] = await db.execute(
        `SELECT user_id, user_name, pickup_address, destination_address 
         FROM cab_bookings 
         WHERE id = ?`,
        [booking_id]
      );
      
      if (bookingRows.length === 0) {
        return res.status(404).json({ error: 'Booking details not found' });
      }
      
      const booking = bookingRows[0];
      const user_id = booking.user_id;
      
      console.log(`🔍 Looking for user ${user_id} FCM token...`);
      
      // Get user's FCM token
      const [userRows] = await db.execute(
        `SELECT fcm_token FROM users WHERE id = ?`,
        [user_id]
      );
      
      if (userRows.length > 0 && userRows[0].fcm_token) {
        const userToken = userRows[0].fcm_token;
        console.log(`📱 Found user FCM token: ${userToken.substring(0, 20)}...`);
        
        try {
          // Send notification to user
          await sendNotification({
            token: userToken,
            title: '🚕 Fare Offer Received!',
            body: `Driver ${driver_name || 'Unknown'} offered Rs. ${proposed_fare} for your ride`,
            data: {
              type: 'new_fare_offer',
              booking_id: booking_id.toString(),
              driver_id: driver_id.toString(),
              proposed_fare: proposed_fare.toString(),
              driver_name: driver_name || '',
              screen: 'cab_booking'
            }
          });
          console.log(`✅ Fare offer notification sent to user ${user_id}`);
        } catch (notifyErr) {
          console.error(`❌ Failed to send notification to user ${user_id}:`, notifyErr.message);
        }
      } else {
        console.warn(`⚠️ No FCM token found for user ${user_id} - notification NOT sent`);
      }
      
      res.status(200).json({
        success: true,
        message: 'Fare offer submitted successfully',
        booking_id: booking_id
      });
      
    } catch (error) {
      console.error('❌ Error submitting fare offer:', error);
      res.status(500).json({ error: 'Failed to submit fare offer' });
    }
  },
  
  // Accept driver's offer
  acceptOffer: async (req, res) => {
    try {
      const { booking_id, driver_id, fare, status } = req.body;
      
      // Validate input
      if (!booking_id || !driver_id || !fare) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Update booking
      await db.execute(
        `UPDATE cab_bookings 
         SET driver_id = ?, fare = ?, status = ?, accepted_at = NOW()
         WHERE id = ?`,
        [driver_id, fare, status, booking_id]
      );
      
      // Get driver details to send notification
      const [driverRows] = await db.execute(
        `SELECT fcm_token FROM drivers WHERE id = ?`,
        [driver_id]
      );
      
      if (driverRows.length > 0 && driverRows[0].fcm_token) {
        await sendNotification({
          token: driverRows[0].fcm_token,
          title: 'Offer Accepted',
          body: 'Your fare offer has been accepted',
          data: {
            type: 'offer_accepted',
            booking_id: booking_id
          }
        });
      }
      
      res.json({
        message: 'Offer accepted successfully'
      });
      
    } catch (error) {
      console.error('Error accepting offer:', error);
      res.status(500).json({ error: 'Failed to accept offer' });
    }
  },
  
  // Driver arrived at pickup location
  driverArrival: async (req, res) => {
    try {
      const { booking_id, status } = req.body;
      
      // Update booking status
      await db.execute(
        `UPDATE cab_bookings 
         SET status = ?, driver_arrived_at = NOW()
         WHERE id = ?`,
        [status, booking_id]
      );
      
      // Get user details to send notification
      const [bookingRows] = await db.execute(
        `SELECT user_id FROM cab_bookings WHERE id = ?`,
        [booking_id]
      );
      
      if (bookingRows.length > 0) {
        const user_id = bookingRows[0].user_id;
        
        const [userRows] = await db.execute(
          `SELECT fcm_token FROM users WHERE id = ?`,
          [user_id]
        );
        
        if (userRows.length > 0 && userRows[0].fcm_token) {
          await sendNotification({
            token: userRows[0].fcm_token,
            title: 'Driver Arrived',
            body: 'Your driver has arrived at pickup location',
            data: {
              type: 'driver_arrived',
              booking_id: booking_id
            }
          });
        }
      }
      
      res.json({
        message: 'Driver arrival updated successfully'
      });
      
    } catch (error) {
      console.error('Error updating driver arrival:', error);
      res.status(500).json({ error: 'Failed to update driver arrival' });
    }
  },
  
  // Start journey
  startJourney: async (req, res) => {
    try {
      const { booking_id, status } = req.body;
      
      // Update booking status
      await db.execute(
        `UPDATE cab_bookings 
         SET status = ?, journey_started_at = NOW()
         WHERE id = ?`,
        [status, booking_id]
      );
      
      res.json({
        message: 'Journey started successfully'
      });
      
    } catch (error) {
      console.error('Error starting journey:', error);
      res.status(500).json({ error: 'Failed to start journey' });
    }
  },
  
  // Complete journey
  completeJourney: async (req, res) => {
    try {
      const { booking_id, status } = req.body;
      
      // Update booking status
      await db.execute(
        `UPDATE cab_bookings 
         SET status = ?, completed_at = NOW()
         WHERE id = ?`,
        [status, booking_id]
      );
      
      // Get booking details
      const [bookingRows] = await db.execute(
        `SELECT user_id, driver_id FROM cab_bookings WHERE id = ?`,
        [booking_id]
      );
      
      if (bookingRows.length > 0) {
        const { user_id, driver_id } = bookingRows[0];
        
        // Get user FCM token to send rating request notification
        const [userRows] = await db.execute(
          `SELECT fcm_token FROM users WHERE id = ?`,
          [user_id]
        );
        
        if (userRows.length > 0 && userRows[0].fcm_token) {
          await sendNotification({
            token: userRows[0].fcm_token,
            title: 'Rate Your Ride',
            body: 'Please rate your ride experience',
            data: {
              type: 'rate_driver',
              booking_id: booking_id,
              driver_id: driver_id
            }
          });
        }
        
        // Get driver FCM token to send rating request notification
        const [driverRows] = await db.execute(
          `SELECT fcm_token FROM drivers WHERE id = ?`,
          [driver_id]
        );
        
        if (driverRows.length > 0 && driverRows[0].fcm_token) {
          await sendNotification({
            token: driverRows[0].fcm_token,
            title: 'Rate Your Passenger',
            body: 'Please rate your passenger',
            data: {
              type: 'rate_passenger',
              booking_id: booking_id,
              user_id: user_id
            }
          });
        }
      }
      
      res.json({
        message: 'Journey completed successfully'
      });
      
    } catch (error) {
      console.error('Error completing journey:', error);
      res.status(500).json({ error: 'Failed to complete journey' });
    }
  },
  
  // Get booking history for a user
  getUserBookingHistory: async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 10, offset = 0 } = req.query;
      
      // Get bookings for this user
      const [rows] = await db.execute(
        `SELECT b.*, 
          u.name as driver_name,
          d.mobile_number as driver_phone,
          d.rating as driver_rating
         FROM cab_bookings b
         LEFT JOIN drivers d ON b.driver_id = d.id
         LEFT JOIN users u ON d.user_id = u.id
         WHERE b.user_id = ?
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, parseInt(limit), parseInt(offset)]
      );
      
      res.json(rows);
      
    } catch (error) {
      console.error('Error getting booking history:', error);
      res.status(500).json({ error: 'Failed to get booking history' });
    }
  },
  
  // Get user bookings with driver offers (for user profile proposals tab)
  getUserBookingsWithOffers: async (req, res) => {
    try {
      const { userId } = req.params;
      
      console.log(`📋 Fetching bookings with offers for user ${userId}`);
      
      // Get all bookings for this user with driver info
      const [bookings] = await db.execute(
        `SELECT 
          cb.*,
          u.name as driver_name
         FROM cab_bookings cb
         LEFT JOIN drivers d ON cb.driver_id = d.id
         LEFT JOIN users u ON d.user_id = u.id
         WHERE cb.user_id = ?
         ORDER BY cb.created_at DESC`,
        [userId]
      );
      
      // For each booking, get driver offers with driver details
      const bookingsWithOffers = await Promise.all(
        bookings.map(async (booking) => {
          const [offers] = await db.execute(
            `SELECT 
              cdo.*,
              u.name as driver_name
             FROM cab_driver_offers cdo
             JOIN drivers d ON cdo.driver_id = d.id
             JOIN users u ON d.user_id = u.id
             WHERE cdo.booking_id = ?
             ORDER BY cdo.offered_at DESC`,
            [booking.id]
          );
          
          return {
            ...booking,
            offers: offers
          };
        })
      );
      
      console.log(`✅ Found ${bookingsWithOffers.length} bookings for user ${userId}`);
      res.json(bookingsWithOffers);
      
    } catch (error) {
      console.error('❌ Error getting user bookings with offers:', error);
      res.status(500).json({ error: 'Failed to get bookings' });
    }
  },
  
  // Get booking details
  getBookingDetails: async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      console.log(`📋 Fetching booking details for ID: ${bookingId}`);
      
      // Get booking details - simple query first
      const [rows] = await db.execute(
        `SELECT * FROM cab_bookings WHERE id = ?`,
        [bookingId]
      );
      
      if (rows.length === 0) {
        console.log(`❌ Booking ${bookingId} not found`);
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const booking = rows[0];
      
      // Get user details if user_id exists
      if (booking.user_id) {
        try {
          const [userRows] = await db.execute(
            `SELECT name, email FROM users WHERE id = ?`,
            [booking.user_id]
          );
          
          if (userRows.length > 0) {
            // Use stored user_name if available, otherwise use from users table
            booking.user_name = booking.user_name || userRows[0].name || 'Unknown';
            booking.user_email = userRows[0].email;
            // user_phone is already in cab_bookings table
          }
        } catch (userErr) {
          console.error('Error fetching user details:', userErr);
          // Continue with booking data
        }
      }
      
      // Ensure user_name is never null
      if (!booking.user_name) {
        booking.user_name = 'Unknown';
      }
      
      console.log(`✅ Booking details loaded: ${booking.user_name}`);
      res.json(booking);
      
    } catch (error) {
      console.error('❌ Error getting booking details:', error.message);
      res.status(500).json({ 
        error: 'Failed to get booking details',
        message: error.message 
      });
    }
  },
  
  // Get all driver offers for a booking (with booking details)
  getBookingOffers: async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      console.log(`📋 Fetching all offers for booking ${bookingId}`);
      
      // Get booking details
      const [bookingRows] = await db.execute(
        `SELECT * FROM cab_bookings WHERE id = ?`,
        [bookingId]
      );
      
      if (bookingRows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      const booking = bookingRows[0];
      
      // Get all driver offers for this booking
      const [offers] = await db.execute(
        `SELECT 
          o.id,
          o.driver_id,
          o.driver_name,
          o.driver_phone,
          o.vehicle_type,
          o.vehicle_number,
          o.proposed_fare,
          o.status,
          o.offered_at,
          d.rating as driver_rating,
          d.profile_image as driver_image
         FROM cab_driver_offers o
         LEFT JOIN drivers d ON o.driver_id = d.id
         WHERE o.booking_id = ?
         ORDER BY o.proposed_fare ASC`,
        [bookingId]
      );
      
      console.log(`✅ Found ${offers.length} offers for booking ${bookingId}`);
      
      res.json({
        success: true,
        booking: booking,
        offers: offers
      });
      
    } catch (error) {
      console.error('❌ Error getting booking offers:', error);
      res.status(500).json({ error: 'Failed to get booking offers' });
    }
  },
  
  // Accept a driver's offer
  acceptDriverOffer: async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { driver_id, accepted_fare } = req.body;
      
      console.log(`✅ Accepting driver ${driver_id} for booking ${bookingId} with fare Rs.${accepted_fare}`);
      
      if (!driver_id || !accepted_fare) {
        return res.status(400).json({ error: 'Missing driver_id or accepted_fare' });
      }
      
      // Check if booking is already accepted
      const [existingBooking] = await db.execute(
        `SELECT status, driver_id FROM cab_bookings WHERE id = ?`,
        [bookingId]
      );
      
      if (existingBooking.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      if (existingBooking[0].status === 'accepted') {
        console.log(`⚠️ Booking ${bookingId} is already accepted by driver ${existingBooking[0].driver_id}`);
        return res.status(400).json({ 
          error: 'Booking already accepted',
          alreadyAccepted: true,
          acceptedDriverId: existingBooking[0].driver_id
        });
      }
      
      // Update booking status to accepted
      const [updateResult] = await db.execute(
        `UPDATE cab_bookings 
         SET status = 'accepted', driver_id = ?, proposed_fare = ?
         WHERE id = ? AND status != 'accepted'`,
        [driver_id, accepted_fare, bookingId]
      );
      
      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      
      // Update accepted driver offer status
      await db.execute(
        `UPDATE cab_driver_offers 
         SET status = 'accepted', responded_at = NOW()
         WHERE booking_id = ? AND driver_id = ?`,
        [bookingId, driver_id]
      );
      
      // Reject all other driver offers
      await db.execute(
        `UPDATE cab_driver_offers 
         SET status = 'rejected', responded_at = NOW()
         WHERE booking_id = ? AND driver_id != ?`,
        [bookingId, driver_id]
      );
      
      console.log(`✅ Booking ${bookingId} accepted by driver ${driver_id}`);
      
      // Get accepted driver's FCM token
      const [driverRows] = await db.execute(
        `SELECT u.fcm_token, u.name as driver_name
         FROM drivers d
         JOIN users u ON d.user_id = u.id
         WHERE d.id = ?`,
        [driver_id]
      );
      
      if (driverRows.length > 0 && driverRows[0].fcm_token) {
        const driverToken = driverRows[0].fcm_token;
        const driverName = driverRows[0].driver_name;
        
        console.log(`📱 Sending acceptance FCM to driver ${driver_id}`);
        
        try {
          await sendNotification({
            token: driverToken,
            title: '🎉 Mubarak Ho! Aap Confirm Ho Gaye!',
            body: `✅ User ne aap ka Rs. ${accepted_fare} wala offer accept kar liya hai!\n📍 Pickup par jayen aur customer ka intezaar karen.`,
            data: {
              type: 'booking_accepted',
              booking_id: bookingId.toString(),
              driver_id: driver_id.toString(),
              accepted_fare: accepted_fare.toString(),
              message: 'Confirmed! Please proceed to pickup location.',
              screen: 'tracking_location'
            }
          });
          console.log(`✅ Acceptance FCM sent to driver ${driver_id}`);
        } catch (fcmErr) {
          console.error(`❌ Failed to send FCM to driver ${driver_id}:`, fcmErr.message);
        }
      }
      
      // Get rejected drivers and send FCM
      const [rejectedDrivers] = await db.execute(
        `SELECT o.driver_id, u.fcm_token
         FROM cab_driver_offers o
         JOIN drivers d ON o.driver_id = d.id
         JOIN users u ON d.user_id = u.id
         WHERE o.booking_id = ? AND o.status = 'rejected' AND u.fcm_token IS NOT NULL`,
        [bookingId]
      );
      
      console.log(`📤 Sending rejection FCM to ${rejectedDrivers.length} drivers`);
      
      for (const rejectedDriver of rejectedDrivers) {
        try {
          await sendNotification({
            token: rejectedDriver.fcm_token,
            title: '⏳ Waiting for Next Booking',
            body: '💼 Is booking me customer ne kisi aur driver ko select kar liya.\n🚕 Agli dafa InshaAllah! Tayyar rahen, nayi ride request aa sakti hai.',
            data: {
              type: 'booking_rejected',
              booking_id: bookingId.toString(),
              message: 'Stay ready for next booking request!'
            }
          });
          console.log(`✅ Rejection FCM sent to driver ${rejectedDriver.driver_id}`);
        } catch (fcmErr) {
          console.error(`❌ Failed to send rejection FCM to driver ${rejectedDriver.driver_id}:`, fcmErr.message);
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Driver offer accepted successfully'
      });
      
    } catch (error) {
      console.error('❌ Error accepting driver offer:', error);
      res.status(500).json({ error: 'Failed to accept driver offer' });
    }
  },
  
  // Get driver booking history (includes accepted bookings AND bookings with driver offers)
  getDriverBookingHistory: async (req, res) => {
    try {
      const { driverId } = req.params;
      
      console.log(`📊 Fetching booking history for driver: ${driverId}`);
      
      // Get all bookings where:
      // 1. Driver is assigned (driver_id = driverId)
      // 2. OR driver has submitted an offer
      const [bookings] = await db.execute(
        `SELECT DISTINCT
          cb.id,
          cb.user_id,
          cb.user_name,
          cb.user_phone,
          cb.pickup_address,
          cb.destination_address,
          cb.pickup_latitude,
          cb.pickup_longitude,
          cb.destination_latitude,
          cb.destination_longitude,
          cb.passenger_count,
          cb.proposed_fare,
          cb.status,
          cb.created_at,
          cb.updated_at,
          cdo.proposed_fare as driver_offered_fare,
          cdo.status as offer_status,
          d.vehicle_number,
          d.vehicle_type,
          u.name as driver_name,
          d.mobile_number as driver_phone
         FROM cab_bookings cb
         LEFT JOIN cab_driver_offers cdo ON cb.id = cdo.booking_id AND cdo.driver_id = ?
         LEFT JOIN drivers d ON cb.driver_id = d.id
         LEFT JOIN users u ON d.user_id = u.id
         WHERE cb.driver_id = ? OR cdo.driver_id = ?
         ORDER BY cb.created_at DESC`,
        [driverId, driverId, driverId]
      );
      
      console.log(`✅ Found ${bookings.length} bookings for driver ${driverId}`);
      
      res.status(200).json({
        success: true,
        bookings: bookings
      });
      
    } catch (error) {
      console.error('❌ Error getting driver booking history:', error);
      res.status(500).json({ error: 'Failed to get driver booking history' });
    }
  },
  
  // Get pending bookings for a driver (bookings they haven't responded to yet)
  getDriverPendingBookings: async (req, res) => {
    try {
      const { driverId } = req.params;
      
      console.log(`📋 Fetching pending bookings for driver: ${driverId}`);
      
      // Get all bookings with status 'requested' or 'pending' that this driver hasn't responded to
      const [bookings] = await db.execute(
        `SELECT 
          cb.id,
          cb.booking_id,
          cb.user_id,
          cb.user_name,
          cb.user_phone,
          cb.pickup_address,
          cb.destination_address,
          cb.pickup_latitude,
          cb.pickup_longitude,
          cb.destination_latitude,
          cb.destination_longitude,
          cb.passenger_count,
          cb.status,
          cb.created_at,
          CASE 
            WHEN cdo.id IS NOT NULL THEN 1
            ELSE 0
          END as has_driver_offer
         FROM cab_bookings cb
         LEFT JOIN cab_driver_offers cdo ON cb.id = cdo.booking_id AND cdo.driver_id = ?
         WHERE cb.status IN ('requested', 'pending')
         AND cdo.id IS NULL
         ORDER BY cb.created_at DESC`,
        [driverId]
      );
      
      console.log(`✅ Found ${bookings.length} pending bookings for driver ${driverId}`);
      
      res.status(200).json({
        success: true,
        bookings: bookings
      });
      
    } catch (error) {
      console.error('❌ Error getting driver pending bookings:', error);
      res.status(500).json({ error: 'Failed to get driver pending bookings' });
    }
  }
};

module.exports = cabBookingsController;
