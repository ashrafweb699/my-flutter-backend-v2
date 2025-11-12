const { pool } = require('../config/db');

// Get order tracking information
exports.getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const [rows] = await pool.query(`
      SELECT 
        ot.*,
        u.name as accepter_name,
        up.mobile_number as accepter_phone,
        d.name as driver_name,
        dp.mobile_number as driver_phone
      FROM order_tracking ot
      LEFT JOIN users u ON ot.accepted_by = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      LEFT JOIN users d ON ot.driver_id = d.id
      LEFT JOIN user_profile dp ON d.id = dp.user_id
      WHERE ot.order_id = ?
      ORDER BY ot.updated_at DESC
      LIMIT 1
    `, [orderId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order tracking not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting order tracking:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order tracking location
exports.updateOrderLocation = async (req, res, io) => {
  try {
    const { orderId } = req.params;
    const { latitude, longitude, driverId, acceptedBy, status } = req.body;
    
    // For order tracking, use acceptedBy (admin/d_boy)
    // For cab booking, use driverId (cab driver)
    const trackerId = acceptedBy || driverId;
    
    // Check if tracking record exists
    const [existing] = await pool.query(
      'SELECT id FROM order_tracking WHERE order_id = ?',
      [orderId]
    );
    
    if (existing.length === 0) {
      // Create new tracking record
      await pool.query(`
        INSERT INTO order_tracking (order_id, accepted_by, latitude, longitude, status)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, trackerId, latitude, longitude, status || 'out_for_delivery']);
    } else {
      // Update existing record - only update location, not accepter
      await pool.query(`
        UPDATE order_tracking 
        SET latitude = ?, longitude = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `, [latitude, longitude, status || 'out_for_delivery', orderId]);
    }
    
    // Update accepter location (for real-time tracking)
    if (trackerId) {
      await pool.query(`
        INSERT INTO driver_locations (driver_id, latitude, longitude, last_seen)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        last_seen = CURRENT_TIMESTAMP
      `, [trackerId, latitude, longitude]);
    }
    
    // Emit socket update for live tracking consumers
    try {
      io && io.emit('order_location_update', {
        order_id: orderId,
        orderId: orderId,
        driverId,
        latitude,
        longitude,
        status: status || 'out_for_delivery',
        ts: Date.now()
      });
      console.log(`📡 Emitted location update for order ${orderId}`);
    } catch (_) {}

    res.json({ success: true, message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating order location:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const [rows] = await pool.query(`
      SELECT 
        un.*,
        o.id as order_id,
        o.totalAmount
      FROM user_notifications un
      LEFT JOIN orders o ON un.order_id = o.id
      WHERE un.user_id = ?
      ORDER BY un.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    res.json({ notifications: rows });
  } catch (error) {
    console.error('Error getting user notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await pool.query(
      'UPDATE user_notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const { userId, orderId, title, message, type = 'general' } = req.body;
    
    const [result] = await pool.query(`
      INSERT INTO user_notifications (user_id, order_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, orderId, title, message, type]);
    
    res.json({ 
      success: true, 
      notificationId: result.insertId,
      message: 'Notification created successfully' 
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res, io) => {
  try {
    const { orderId } = req.params;
    const { status, reason, changedBy, performedByUserId, performedByUserType } = req.body;
    
    // Get current order details
    const [currentOrder] = await pool.query(
      'SELECT status, totalAmount FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (currentOrder.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const oldStatus = currentOrder[0].status;
    const orderAmount = currentOrder[0].totalAmount || 0;
    
    // Update order status
    await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );
    
    // Record status change in history
    await pool.query(`
      INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, reason)
      VALUES (?, ?, ?, ?, ?)
    `, [orderId, oldStatus, status, changedBy, reason]);
    
    // Update order tracking status
    await pool.query(
      'UPDATE order_tracking SET status = ? WHERE order_id = ?',
      [status, orderId]
    );
    
    // Record in order_statistics if action is trackable
    const trackableActions = ['accepted', 'rejected', 'delivered', 'cancelled'];
    if (trackableActions.includes(status) && performedByUserId) {
      try {
        // Get user name
        const [user] = await pool.query(
          'SELECT name FROM users WHERE id = ?',
          [performedByUserId]
        );
        const userName = user.length > 0 ? user[0].name : 'Unknown';
        
        await pool.query(`
          INSERT INTO order_statistics 
          (order_id, action_type, performed_by_user_id, performed_by_user_type, performed_by_name, order_total_amount, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [orderId, status, performedByUserId, performedByUserType || 'admin', userName, orderAmount, reason]);
        
        console.log(`✅ Order statistics recorded: Order #${orderId} ${status} by ${userName} (${performedByUserType})`);
      } catch (statsError) {
        console.error('⚠️ Failed to record order statistics:', statsError);
        // Don't fail the whole request if statistics recording fails
      }
    }
    
    // Create notification for user
    const [order] = await pool.query(
      'SELECT userId FROM orders WHERE id = ?',
      [orderId]
    );
    
    if (order.length > 0) {
      const statusMessages = {
        'pending': 'Your order has been received and is being processed.',
        'confirmed': 'Your order has been confirmed and is being prepared.',
        'preparing': 'Your order is being prepared.',
        'out_for_delivery': 'Your order is out for delivery.',
        'delivered': 'Your order has been delivered successfully.',
        'cancelled': 'Your order has been cancelled.',
        'accepted': 'Your order has been accepted and is being prepared.',
        'rejected': 'Your order has been rejected.'
      };
      
      await pool.query(`
        INSERT INTO user_notifications (user_id, order_id, title, message, type)
        VALUES (?, ?, 'Order Status Update', ?, 'order_update')
      `, [order[0].userId, orderId, statusMessages[status] || 'Your order status has been updated.']);
    }

    // Emit socket update for order status
    try {
      io && io.emit('order_status_update', {
        orderId,
        status,
        ts: Date.now()
      });
    } catch (_) {}
    
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get driver locations
exports.getDriverLocations = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        dl.*,
        u.name as driver_name,
        up.mobile_number as driver_phone
      FROM driver_locations dl
      JOIN users u ON dl.driver_id = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE dl.is_online = TRUE
      AND dl.last_seen > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      ORDER BY dl.last_seen DESC
    `);
    
    res.json({ drivers: rows });
  } catch (error) {
    console.error('Error getting driver locations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order status history
exports.getOrderStatusHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const [rows] = await pool.query(`
      SELECT 
        osh.*,
        u.name as changed_by_name
      FROM order_status_history osh
      LEFT JOIN users u ON osh.changed_by = u.id
      WHERE osh.order_id = ?
      ORDER BY osh.created_at DESC
    `, [orderId]);
    
    res.json({ history: rows });
  } catch (error) {
    console.error('Error getting order status history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
