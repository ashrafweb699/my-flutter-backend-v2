const express = require('express');
const router = express.Router();
const FCMTokenValidator = require('../services/fcmTokenValidator');
const { pool } = require('../config/db');

/**
 * 🏥 FCM Token Health Management Routes
 */

/**
 * POST /api/fcm-health/validate-token
 * Validate a specific FCM token
 */
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const result = await FCMTokenValidator.validateToken(token);

    res.json({
      success: true,
      valid: result.valid,
      reason: result.reason
    });

  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/fcm-health/cleanup
 * Clean all invalid tokens (Admin only)
 */
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 Starting token cleanup...');
    
    const stats = await FCMTokenValidator.cleanInvalidTokens();

    res.json({
      success: true,
      stats: stats,
      message: `Cleaned ${stats.cleaned} invalid tokens out of ${stats.total} total tokens`
    });

  } catch (error) {
    console.error('Token cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fcm-health/stats
 * Get token health statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await FCMTokenValidator.getTokenHealthStats();

    // Get recent logs
    const [recentLogs] = await pool.query(`
      SELECT * FROM fcm_token_health_logs
      ORDER BY check_date DESC
      LIMIT 10
    `);

    // Get notification analytics for last 7 days
    const [analytics] = await pool.query(`
      SELECT * FROM notification_analytics
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      tokenHealth: stats,
      recentLogs: recentLogs,
      analytics: analytics
    });

  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/fcm-health/test-notification
 * Send test notification to a specific token
 */
router.post('/test-notification', async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const result = await FCMTokenValidator.sendTestNotification(token);

    // Log the test
    if (userId) {
      await pool.query(`
        INSERT INTO notification_delivery_logs
        (user_id, fcm_token, notification_title, notification_body, delivery_status, sent_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        token,
        'Test Notification',
        'This is a test notification',
        result.success ? 'sent' : 'failed'
      ]);
    }

    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/fcm-health/user-token/:userId
 * Get token status for a specific user
 */
router.get('/user-token/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [user] = await pool.query(`
      SELECT 
        id,
        email,
        fcm_token,
        fcm_token_validated_at,
        fcm_token_invalidated_at,
        fcm_token_last_used_at
      FROM users
      WHERE id = ?
    `, [userId]);

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = user[0];
    let tokenStatus = 'no_token';

    if (userData.fcm_token) {
      if (userData.fcm_token_invalidated_at) {
        tokenStatus = 'invalidated';
      } else if (userData.fcm_token_validated_at) {
        tokenStatus = 'validated';
      } else {
        tokenStatus = 'unvalidated';
      }
    }

    res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        hasToken: !!userData.fcm_token,
        tokenStatus: tokenStatus,
        validatedAt: userData.fcm_token_validated_at,
        invalidatedAt: userData.fcm_token_invalidated_at,
        lastUsedAt: userData.fcm_token_last_used_at
      }
    });

  } catch (error) {
    console.error('User token fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/fcm-health/refresh-token
 * Request user to refresh their FCM token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { userId, newToken } = req.body;

    if (!userId || !newToken) {
      return res.status(400).json({
        success: false,
        error: 'userId and newToken are required'
      });
    }

    // Validate the new token
    const validation = await FCMTokenValidator.validateToken(newToken);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FCM token',
        reason: validation.reason
      });
    }

    // Update token in database
    await pool.query(`
      UPDATE users
      SET 
        fcm_token = ?,
        fcm_token_validated_at = NOW(),
        fcm_token_invalidated_at = NULL,
        updated_at = NOW()
      WHERE id = ?
    `, [newToken, userId]);

    console.log(`✅ Token refreshed for user ${userId}`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      validated: true
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
