const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Update FCM token for user
router.post('/token', async (req, res) => {
  try {
    const { userId, token, userType } = req.body;
    
    console.log('📱 FCM Token Update Request:', { userId, userType, token: token?.substring(0, 20) + '...' });
    
    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'User ID and FCM token are required'
      });
    }
    
    // 1) Detach this token from any other users (prevent cross-account mixups)
    await pool.query(
      'UPDATE users SET fcm_token = NULL WHERE fcm_token = ? AND id <> ?',
      [token, userId]
    );

    // 2) Update token for current user
    await pool.query('UPDATE users SET fcm_token = ? WHERE id = ?', [token, userId]);

    // Note: extra fcm_tokens table no longer required; using users.fcm_token only
    
    console.log(`✅ FCM token updated for user ${userId}`);
    
    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating FCM token:', error);
    if (error && (error.code === 'ER_READ_ONLY_MODE' || /read-only/i.test(error.message))) {
      console.warn('⚠️ DB is read-only; proceeding without persisting FCM token');
      return res.json({
        success: true,
        message: 'Running in read-only mode: token not persisted, using topic fallback',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message
    });
  }
});

// Get FCM token for user
router.get('/token/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [rows] = await pool.query(
      'SELECT fcm_token FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      token: rows[0].fcm_token
    });
    
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FCM token',
      error: error.message
    });
  }
});

module.exports = router;
