const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Get all notifications history (admin)
router.get('/', async (req, res) => {
  try {
    console.log('📢 Fetching admin notifications history');
    
    // Get from both notifications and user_notifications tables
    const [adminNotifications] = await pool.query(`
      SELECT 
        id,
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM user_notifications 
      WHERE user_id = 1 OR user_id IN (SELECT id FROM users WHERE user_type = 'admin')
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${adminNotifications.length} admin notifications`);
    res.json({ 
      success: true,
      notifications: adminNotifications 
    });
  } catch (error) {
    console.error('❌ Error fetching admin notifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message 
    });
  }
});

// Get user notifications
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📢 Fetching notifications for user ${userId}`);
    
    const [userNotifications] = await pool.query(`
      SELECT 
        id,
        user_id,
        order_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM user_notifications 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
    
    console.log(`✅ Found ${userNotifications.length} notifications for user ${userId}`);
    res.json({ 
      success: true,
      notifications: userNotifications 
    });
  } catch (error) {
    console.error('❌ Error fetching user notifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user notifications',
      message: error.message 
    });
  }
});

// Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    console.log(`📢 Marking notification ${notificationId} as read`);
    
    await pool.query(`
      UPDATE user_notifications 
      SET is_read = 1 
      WHERE id = ?
    `, [notificationId]);
    
    console.log(`✅ Notification ${notificationId} marked as read`);
    res.json({ 
      success: true,
      message: 'Notification marked as read' 
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message 
    });
  }
});

const admin = require('firebase-admin');
const notificationController = require('../controllers/notificationController');

// Send notification - Use proper controller with v4 channel support
router.post('/send', notificationController.sendNotification);

// Get notification by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await pool.query(`
      SELECT 
        id,
        user_id,
        order_id,
        title,
        message,
        type,
        is_read,
        created_at
      FROM user_notifications 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Notification not found' 
      });
    }
    
    res.json({ 
      success: true,
      notification: rows[0] 
    });
  } catch (error) {
    console.error('❌ Error fetching notification:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notification',
      message: error.message 
    });
  }
});

// Send to a specific user by id and optional user_type (defaults to users table)
router.post('/send-to-user', async (req, res) => {
  try {
    const { userId, title, message, imageUrl, data, userType } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ success: false, error: 'userId, title, message required' });
    }

    const { pool } = require('../config/db');
    const [rows] = await pool.query(
      `SELECT fcm_token FROM users WHERE id = ? AND IFNULL(fcm_token,'') <> ''`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No token for user' });
    }
    const token = rows[0].fcm_token;

    // Ensure Firebase Admin init
    if (!admin.apps.length) {
      try {
        const sa = require('../firebase-service-account.json');
        admin.initializeApp({ credential: admin.credential.cert(sa) });
      } catch (e) {
        console.error('❌ Firebase Admin init failed:', e.message);
      }
    }

    await admin.messaging().send({
      token,
      notification: { title, body: message },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        ...(data || {}),
      },
      android: {
        priority: 'high',
        notification: { channelId: 'high_importance_channel', sound: 'default', priority: 'high' },
      },
    });

    res.json({ success: true, message: 'Sent to user' });
  } catch (error) {
    console.error('❌ Error send-to-user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send to a specific FCM token directly
router.post('/send-to-token', async (req, res) => {
  try {
    const { token, title, message, data } = req.body;
    if (!token || !title || !message) {
      return res.status(400).json({ success: false, error: 'token, title, message required' });
    }

    if (!admin.apps.length) {
      try {
        const sa = require('../firebase-service-account.json');
        admin.initializeApp({ credential: admin.credential.cert(sa) });
      } catch (e) {
        console.error('❌ Firebase Admin init failed:', e.message);
      }
    }

    await admin.messaging().send({
      token,
      notification: { title, body: message },
      data: { click_action: 'FLUTTER_NOTIFICATION_CLICK', ...(data || {}) },
      android: {
        priority: 'high',
        notification: { channelId: 'high_importance_channel', sound: 'default', priority: 'high' },
      },
    });

    res.json({ success: true, message: 'Sent to token' });
  } catch (error) {
    console.error('❌ Error send-to-token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
