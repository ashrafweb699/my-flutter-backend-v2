const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * @route   POST /api/bookings
 * @desc    Create a new cab booking
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    console.log('Received booking request:', JSON.stringify(req.body, null, 2));
    
    const {
      user_id,
      user_name,
      user_phone,
      pickup,
      destination,
      passenger_count
    } = req.body;

    // Set default user_name if empty
    const defaultUserName = user_name || 'Guest User';

    if (!user_id || !pickup || !destination) {
      console.log('Missing required fields:', { user_id, pickup, destination });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required booking information' 
      });
    }

    // Check pickup and destination format
    if (!pickup.latitude || !pickup.longitude || !pickup.address ||
        !destination.latitude || !destination.longitude || !destination.address) {
      console.log('Invalid pickup or destination format:', { pickup, destination });
      return res.status(400).json({
        success: false,
        error: 'Invalid pickup or destination format'
      });
    }

    // Generate a unique booking_id (timestamp + random string)
    const booking_id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Insert into database
    const query = `
      INSERT INTO cab_bookings (
        booking_id,
        user_id,
        user_name,
        user_phone,
        pickup_latitude,
        pickup_longitude,
        pickup_address,
        destination_latitude,
        destination_longitude,
        destination_address,
        passenger_count,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')
    `;
    
    const values = [
      booking_id,
      user_id,
      defaultUserName,
      user_phone || '',
      pickup.latitude,
      pickup.longitude,
      pickup.address,
      destination.latitude,
      destination.longitude,
      destination.address,
      passenger_count || 1
    ];
    
    const [result] = await db.execute(query, values);
    
    // Send FCM notification to all online drivers
    if (global.firebaseAdmin) {
      try {
        console.log('Fetching online drivers to send booking notification...');
        // Get all drivers with FCM tokens
        const [drivers] = await db.execute(
          'SELECT id, fcm_token FROM drivers WHERE fcm_token IS NOT NULL AND approval_status = "approved" AND online_status = "online"'
        );

        console.log(`Found ${drivers.length} online drivers with FCM tokens`);
        
        if (drivers.length > 0) {
          const tokens = drivers
            .filter(driver => driver.fcm_token)
            .map(driver => driver.fcm_token);
          
          if (tokens.length > 0) {
            // Calculate approximate distance for notification
            const distanceKm = calculateDistance(
              pickup.latitude, pickup.longitude,
              destination.latitude, destination.longitude
            );
            
            const estimatedFare = Math.round(distanceKm * 100); // Simple fare calculation in PKR
            
            const notification = {
              title: 'New Cab Booking Request!',
              body: `New ride request from ${pickup.address} to ${destination.address} (${distanceKm.toFixed(1)}km)`,
            };
            
            // Use HTTP FCM API instead of Firebase Admin
            try {
              console.log(`Sending HTTP FCM notifications to ${tokens.length} drivers...`);
              
              // Create notification data
              const data = {
                type: 'new_booking',
                booking_id: booking_id,
                user_name: defaultUserName,
                pickup_latitude: pickup.latitude.toString(),
                pickup_longitude: pickup.longitude.toString(),
                pickup_address: pickup.address,
                destination_latitude: destination.latitude.toString(), 
                destination_longitude: destination.longitude.toString(),
                destination_address: destination.address,
                estimated_fare: estimatedFare.toString(),
                passenger_count: (passenger_count || 1).toString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
              };

              // FCM server key
              const FCM_SERVER_KEY = "AAAA0i0qljQ:APA91bHXu-Xc86ERsaxNXpTIMgTxbsDtBSfHZmahLKnTqkAcCXpMQLHk61xXla9B2OvCz4rh6zvI5SBvxNNDsogUOrJR60me0_iBCBfi7esc3a4HdVMRB5l1YXzvIiCzdMPFgFeUr61H";
              
              // FCM API URL
              const FCM_URL = 'https://fcm.googleapis.com/fcm/send';
              
              // Count successful sends
              let successCount = 0;
              
              // Create axios or http request
              const http = require('http');
              const https = require('https');
              
              // Send to each token individually
              for (const token of tokens) {
                try {
                  // Prepare request data
                  const fcmMessage = {
                    to: token,
                    notification: notification,
                    data: data,
                    android: {
                      priority: 'high',
                      notification: {
                        sound: 'default',
                        priority: 'high',
                        default_sound: true,
                        default_vibrate_timings: true,
                      }
                    },
                  };
                  
                  // Send HTTP request to FCM
                  const options = {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `key=${FCM_SERVER_KEY}`
                    }
                  };
                  
                  // Make the request
                  const req = https.request(FCM_URL, options, (res) => {
                    let responseData = '';
                    
                    res.on('data', (chunk) => {
                      responseData += chunk;
                    });
                    
                    res.on('end', () => {
                      try {
                        const parsedData = JSON.parse(responseData);
                        if (parsedData.success === 1) {
                          successCount++;
                          console.log(`Successfully sent notification to token: ${token.substr(0, 15)}...`);
                        } else {
                          console.error(`Failed to send to token ${token.substr(0, 15)}... Response: `, parsedData);
                        }
                      } catch (err) {
                        console.error(`Error parsing FCM response: ${err.message}`);
                      }
                    });
                  });
                  
                  // Handle request errors
                  req.on('error', (err) => {
                    console.error(`Error sending FCM to ${token.substr(0, 15)}...: ${err.message}`);
                  });
                  
                  // Send the request
                  req.write(JSON.stringify(fcmMessage));
                  req.end();
                  
                } catch (individualError) {
                  console.error(`Failed to send to token ${token.substr(0, 15)}...: ${individualError.message}`);
                }
              }
              
              console.log(`FCM HTTP Notification attempted for ${tokens.length} drivers`);
            } catch (fcmError) {
              console.error('Error in HTTP FCM sending:', fcmError);
            }
            
            // Also send to all drivers topic as backup using HTTP
            try {
              const FCM_SERVER_KEY = "AAAA0i0qljQ:APA91bHXu-Xc86ERsaxNXpTIMgTxbsDtBSfHZmahLKnTqkAcCXpMQLHk61xXla9B2OvCz4rh6zvI5SBvxNNDsogUOrJR60me0_iBCBfi7esc3a4HdVMRB5l1YXzvIiCzdMPFgFeUr61H";
              const FCM_URL = 'https://fcm.googleapis.com/fcm/send';
              const https = require('https');
              
              // Prepare message for topic
              const topicMessage = {
                to: '/topics/all_drivers',
                notification: notification,
                data: {
                  type: 'new_booking',
                  booking_id: booking_id,
                  user_name: defaultUserName,
                  pickup_latitude: pickup.latitude.toString(),
                  pickup_longitude: pickup.longitude.toString(),
                  pickup_address: pickup.address,
                  destination_latitude: destination.latitude.toString(), 
                  destination_longitude: destination.longitude.toString(),
                  destination_address: destination.address,
                  estimated_fare: estimatedFare.toString(),
                  passenger_count: (passenger_count || 1).toString(),
                  click_action: 'FLUTTER_NOTIFICATION_CLICK',
                },
                android: {
                  priority: 'high',
                  notification: {
                    sound: 'default',
                    priority: 'high',
                    default_sound: true,
                    default_vibrate_timings: true,
                  }
                },
              };
              
              // Send HTTP request
              const options = {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `key=${FCM_SERVER_KEY}`
                }
              };
              
              const req = https.request(FCM_URL, options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                  responseData += chunk;
                });
                
                res.on('end', () => {
                  try {
                    const parsedData = JSON.parse(responseData);
                    if (parsedData.success === 1) {
                      console.log('Notification sent to all_drivers topic successfully');
                    } else {
                      console.error('Failed to send topic notification. Response:', parsedData);
                    }
                  } catch (err) {
                    console.error(`Error parsing topic FCM response: ${err.message}`);
                  }
                });
              });
              
              req.on('error', (err) => {
                console.error(`Error sending topic notification: ${err.message}`);
              });
              
              req.write(JSON.stringify(topicMessage));
              req.end();
              
              console.log('HTTP notification also sent to all_drivers topic');
            } catch (topicError) {
              console.error('Error sending HTTP notification to all_drivers topic:', topicError);
            }
          }
        } else {
          console.log('No online drivers with FCM tokens found');
        }
      } catch (fcmError) {
        console.error('Error sending FCM notification:', fcmError);
        // Don't fail the booking creation if notification fails
      }
    } else {
      console.log('Firebase Admin SDK not initialized, skipping driver notifications');
    }
    
    // Return success with booking information
    res.status(201).json({
      success: true,
      booking_id: booking_id,
      message: 'Cab booking created successfully',
      booking_data: {
        booking_id,
        user_id,
        user_name: defaultUserName,
        status: 'requested',
        created_at: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create booking',
      details: error.message 
    });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

/**
 * @route   PUT /api/bookings/:booking_id/status
 * @desc    Update booking status (accept/reject by user or driver)
 * @access  Public
 */
router.put('/:booking_id/status', async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { 
      status, 
      driver_id, 
      driver_name, 
      driver_phone,
      vehicle_type,
      vehicle_number,
      proposed_fare
    } = req.body;
    
    // Validate status value
    const validStatuses = ['requested', 'proposed', 'accepted', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }
    
    // Start building the query
    let query = 'UPDATE cab_bookings SET status = ?';
    let values = [status];
    
    // If driver is proposing a fare
    if (status === 'proposed' && driver_id && proposed_fare) {
      query += ', driver_id = ?, driver_name = ?, driver_phone = ?, vehicle_type = ?, vehicle_number = ?, proposed_fare = ?';
      values.push(driver_id, driver_name || '', driver_phone || '', vehicle_type || '', vehicle_number || '', proposed_fare);
    }
    
    // Finalize query
    query += ' WHERE booking_id = ?';
    values.push(booking_id);
    
    const [result] = await db.execute(query, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    // Return success
    res.status(200).json({
      success: true,
      booking_id: booking_id,
      status: status,
      message: `Booking status updated to ${status}`
    });
    
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update booking status',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/bookings/:booking_id
 * @desc    Get booking details by ID
 * @access  Public
 */
router.get('/:booking_id', async (req, res) => {
  try {
    const { booking_id } = req.params;
    
    const [rows] = await db.execute(
      'SELECT * FROM cab_bookings WHERE booking_id = ?',
      [booking_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      booking: rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking details',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/bookings/user/:user_id
 * @desc    Get all bookings for a specific user
 * @access  Public
 */
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const [rows] = await db.execute(
      'SELECT * FROM cab_bookings WHERE user_id = ? ORDER BY created_at DESC',
      [user_id]
    );
    
    res.status(200).json({
      success: true,
      bookings: rows
    });
    
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking history',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/bookings/driver/:driver_id
 * @desc    Get all bookings for a specific driver
 * @access  Public
 */
router.get('/driver/:driver_id', async (req, res) => {
  try {
    const { driver_id } = req.params;
    
    const [rows] = await db.execute(
      'SELECT * FROM cab_bookings WHERE driver_id = ? ORDER BY created_at DESC',
      [driver_id]
    );
    
    res.status(200).json({
      success: true,
      bookings: rows
    });
    
  } catch (error) {
    console.error('Error fetching driver bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booking history',
      details: error.message
    });
  }
});

module.exports = router; 