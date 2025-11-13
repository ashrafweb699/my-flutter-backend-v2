const { pool } = require('../config/db');
const { sendOrderNotificationToAdmin } = require('../services/fcmService');

exports.create = (io) => async (req, res) => {
  try {
    console.log('📦 OrdersController.create called');
    console.log('📦 Request body:', req.body);
    
    // Expect payload keys: userId (string), userName (optional), items (array), totalAmount (number)
    // New fields: customerName, customerPhone, deliveryAddress, latitude, longitude
    let { userId, userName, items, totalAmount, customerName, customerPhone, deliveryAddress, latitude, longitude, lat, lng } = req.body;
    if (!userId && req.body.user_id) userId = req.body.user_id;
    if (typeof totalAmount === 'undefined' && typeof req.body.total_amount !== 'undefined') {
      totalAmount = req.body.total_amount;
    }
    if (!userId || !Array.isArray(items) || typeof totalAmount === 'undefined') {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    
    const totalItems = Array.isArray(items) ? items.length : 0;
    // Normalize latitude/longitude keys
    const orderLatitude = typeof latitude !== 'undefined' ? latitude : lat;
    const orderLongitude = typeof longitude !== 'undefined' ? longitude : lng;

    const [r] = await pool.query(
      `INSERT INTO orders (userId, userName, items, totalAmount, totalItems, status, customer_name, customer_phone, delivery_address, latitude, longitude) VALUES (?,?,?,?,?, 'pending', ?, ?, ?, ?, ?)`,
      [String(userId), userName || customerName || null, JSON.stringify(items), totalAmount, totalItems, customerName, customerPhone, deliveryAddress, orderLatitude ?? null, orderLongitude ?? null]
    );
    
    const [rows] = await pool.query(`SELECT * FROM orders WHERE id=?`, [r.insertId]);
    const order = rows[0];
    
    // Clear cart_orders for this user after successful order
    try {
      await pool.query(`DELETE FROM cart_orders WHERE user_id=?`, [userId]);
    } catch (_) {}
    
    // Update user profile with provided information if available
    if (customerName || customerPhone || deliveryAddress) {
      try {
        // Check if user profile exists
        const [profileRows] = await pool.query(`SELECT * FROM user_profile WHERE user_id = ?`, [userId]);
        
        if (profileRows.length > 0) {
          // Update existing profile
          await pool.query(
            `UPDATE user_profile SET mobile_number = COALESCE(?, mobile_number), address = COALESCE(?, address) WHERE user_id = ?`,
            [customerPhone, deliveryAddress, userId]
          );
        } else {
          // Create new profile
          await pool.query(
            `INSERT INTO user_profile (user_id, mobile_number, address) VALUES (?, ?, ?)`,
            [userId, customerPhone, deliveryAddress]
          );
        }
        
        // Also update users table name if provided
        if (customerName) {
          await pool.query(`UPDATE users SET name = ? WHERE id = ?`, [customerName, userId]);
        }
        
        console.log('✅ User profile updated successfully');
      } catch (profileError) {
        console.error('❌ Error updating user profile:', profileError);
        // Don't fail the order if profile update fails
      }
    }
    
    // Send socket notification to admin
    io.emit('new_order', order);
    
    // Send FCM notification to admin
    try {
      await sendOrderNotificationToAdmin(order);
    } catch (fcmError) {
      console.error('❌ FCM notification failed:', fcmError);
      // Don't fail the order if FCM fails
    }
    // Send FCM notification to delivery boys
    try {
      const { sendOrderNotificationToDeliveryBoys } = require('../services/fcmService');
      await sendOrderNotificationToDeliveryBoys(order);
    } catch (fcmError) {
      console.error('❌ Delivery FCM notification failed:', fcmError.message || fcmError);
    }
    
    console.log('✅ Order created successfully:', order.id);
    res.json({ id: r.insertId, order });
  } catch (e) {
    console.error('❌ orders.create error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listAll = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (month && year) {
      const [rows] = await pool.query(
        `SELECT * FROM orders WHERE MONTH(timestamp)=? AND YEAR(timestamp)=? ORDER BY id DESC`,
        [parseInt(month, 10), parseInt(year, 10)]
      );
      return res.json({ orders: rows });
    }
    const [rows] = await pool.query(`SELECT * FROM orders ORDER BY id DESC`);
    res.json({ orders: rows });
  } catch (e) {
    console.error('orders.listAll error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// List orders for a specific user
exports.listByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const [rows] = await pool.query(`SELECT * FROM orders WHERE userId=? ORDER BY id DESC`, [String(userId)]);
    res.json({ orders: rows });
  } catch (e) {
    console.error('orders.listByUser error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status (accepted/rejected/delivered) with optional notes
exports.updateStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { status, delivery_message, estimated_delivery_time, order_type } = req.body;
    if (!id || !status) return res.status(400).json({ message: 'id and status required' });

    console.log(`📦 Updating order ${id} status to: ${status}`);
    console.log(`⏱️ Estimated delivery time: ${estimated_delivery_time}`);
    console.log(`📋 Order type: ${order_type}`);

    // Map status to timestamp fields
    let tsField = null;
    if (status === 'accepted' || status === 'confirmed') tsField = 'accepted_at';
    if (status === 'rejected' || status === 'cancelled') tsField = 'canceled_at';
    if (status === 'delivered' || status === 'success') tsField = 'delivered_at';

    const updates = [`status = ?`, `delivery_notes = COALESCE(?, delivery_notes)`];
    const params = [status, delivery_message || null];
    
    if (estimated_delivery_time) {
      // Convert estimated time to DATETIME
      const timeValue = parseInt(estimated_delivery_time);
      const timeUnit = order_type === 'service' ? 'MINUTE' : 'DAY';
      updates.push(`estimated_delivery_time = DATE_ADD(NOW(), INTERVAL ${timeValue} ${timeUnit})`);
    }
    
    if (order_type) {
      updates.push(`order_type = ?`);
      params.push(order_type);
    }
    
    if (tsField) {
      updates.push(`${tsField} = NOW()`);
    }
    params.push(id);

    await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query(`SELECT * FROM orders WHERE id=?`, [id]);
    const order = rows[0];

    // Create or update order tracking record when order is accepted
    if (status === 'accepted' || status === 'confirmed') {
      try {
        // Get accepter's user ID (admin or delivery boy)
        const accepterId = req.user?.id || null;
        
        // Check if tracking record exists
        const [trackingRows] = await pool.query(
          'SELECT id FROM order_tracking WHERE order_id = ?',
          [id]
        );
        
        if (trackingRows.length === 0) {
          // Create new tracking record with order's delivery location and accepter ID
          await pool.query(`
            INSERT INTO order_tracking (order_id, accepted_by, status, latitude, longitude, order_type, estimated_delivery_time, tracking_start_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            id,
            accepterId,
            status,
            order.latitude || null,
            order.longitude || null,
            order_type || 'product',
            estimated_delivery_time || null
          ]);
          console.log(`✅ Created tracking record for order ${id} with accepter ${accepterId}`);
        } else {
          // Update existing tracking record with accepter ID
          await pool.query(`
            UPDATE order_tracking 
            SET accepted_by = ?, status = ?, order_type = ?, estimated_delivery_time = ?, tracking_start_time = NOW(), updated_at = NOW()
            WHERE order_id = ?
          `, [accepterId, status, order_type || 'product', estimated_delivery_time || null, id]);
          console.log(`✅ Updated tracking record for order ${id} with accepter ${accepterId}`);
        }
      } catch (trackingError) {
        console.error('❌ Error creating/updating tracking record:', trackingError.message);
      }
    }

    // emit to sockets
    try { io.emit('order_updated', { id, status, order }); } catch (_) {}

    // Send FCM notification to user
    try {
      const userId = order.user_id || order.userId;
      if (userId) {
        const [userRows] = await pool.query(
          'SELECT fcm_token FROM users WHERE id = ? AND fcm_token IS NOT NULL AND fcm_token != \'\'',
          [userId]
        );
        
        if (userRows.length > 0 && userRows[0].fcm_token) {
          const admin = require('firebase-admin');
          const fcmToken = userRows[0].fcm_token;
          
          let title = 'Order Update';
          let body = `Your order #${id} status: ${status}`;
          
          if (status === 'accepted' || status === 'confirmed') {
            const timeUnit = order_type === 'service' ? 'minutes' : 'days';
            title = '✅ Order Confirmed!';
            body = `Your order #${id} has been confirmed. Estimated delivery: ${estimated_delivery_time || 'Soon'} ${timeUnit}`;
          } else if (status === 'rejected' || status === 'cancelled') {
            title = '❌ Order Cancelled';
            body = `Your order #${id} has been cancelled. ${delivery_message || ''}`;
          } else if (status === 'delivered' || status === 'success') {
            title = '🎉 Order Delivered!';
            body = `Your order #${id} has been delivered successfully!`;
          }
          
          const message = {
            notification: { title, body },
            android: {
              notification: {
                channelId: 'high_importance_channel',
                sound: 'default',
              },
              priority: 'high',
            },
            data: {
              type: 'order_update',
              order_id: String(id),
              status: status,
              order_type: order_type || 'product',
              estimated_time: estimated_delivery_time || '',
            },
            token: fcmToken,
          };
          
          await admin.messaging().send(message);
          console.log(`✅ FCM notification sent to user ${userId} for order ${id}`);
        } else {
          console.log(`⚠️ No FCM token found for user ${userId}`);
        }
      }
    } catch (fcmError) {
      console.error('❌ FCM notification failed:', fcmError.message);
      // Don't fail the order update if FCM fails
    }

    res.json({ success: true, order });
  } catch (e) {
    console.error('orders.updateStatus error', e);
    res.status(500).json({ message: 'Server error' });
  }
};


