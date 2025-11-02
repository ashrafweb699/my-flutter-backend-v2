const admin = require('firebase-admin');
const { pool } = require('../config/db');
const FCMTokenValidator = require('./fcmTokenValidator');

/**
 * 🚀 Improved FCM Service
 * Enhanced notification delivery with rich content and engagement tracking
 */

class ImprovedFCMService {

  /**
   * Send rich notification with image, actions, and deep links
   */
  static async sendRichNotification({
    userId,
    title,
    body,
    imageUrl = null,
    data = {},
    priority = 'high',
    deepLink = null,
    actions = []
  }) {
    try {
      // Get user's FCM token
      const [users] = await pool.query(
        'SELECT id, email, fcm_token FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const user = users[0];
      const token = user.fcm_token;

      if (!token) {
        return { success: false, error: 'No FCM token for user' };
      }

      // Validate token first (optional but recommended)
      const validation = await FCMTokenValidator.validateToken(token);
      if (!validation.valid) {
        console.log(`⚠️ Invalid token for user ${userId}: ${validation.reason}`);
        
        // Clean invalid token
        await pool.query(
          'UPDATE users SET fcm_token = NULL, fcm_token_invalidated_at = NOW() WHERE id = ?',
          [userId]
        );
        
        return { success: false, error: 'Invalid token', reason: validation.reason };
      }

      // Build FCM message with rich content
      const message = {
        notification: {
          title: title,
          body: body,
          ...(imageUrl && { imageUrl: imageUrl })
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...(deepLink && { deep_link: deepLink }),
          timestamp: Date.now().toString(),
          ...this.sanitizeData(data)
        },
        token: token,
        android: {
          priority: priority,
          notification: {
            channelId: 'high_importance_channel',
            priority: 'max',
            defaultSound: true,
            defaultVibrateTimings: true,
            defaultLightSettings: true,
            ...(imageUrl && { 
              imageUrl: imageUrl,
              style: 'bigpicture'
            }),
            // Add action buttons (Android)
            ...(actions.length > 0 && {
              actions: actions.map(action => ({
                title: action.title,
                action: action.action
              }))
            })
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: title,
                body: body
              },
              sound: 'default',
              badge: 1,
              'mutable-content': 1, // Enable rich notifications on iOS
              'content-available': 1
            }
          },
          fcmOptions: {
            ...(imageUrl && { imageUrl: imageUrl })
          }
        }
      };

      // Send notification
      const response = await admin.messaging().send(message);
      
      console.log(`✅ Rich notification sent to user ${userId}: ${response}`);

      // Log delivery
      await this.logDelivery({
        userId,
        token,
        title,
        body,
        status: 'sent',
        messageId: response
      });

      // Update token last used
      await pool.query(
        'UPDATE users SET fcm_token_last_used_at = NOW() WHERE id = ?',
        [userId]
      );

      return { 
        success: true, 
        messageId: response,
        userId: userId 
      };

    } catch (error) {
      console.error(`❌ Failed to send rich notification:`, error);
      
      // Log failed delivery
      await this.logDelivery({
        userId,
        token: user?.fcm_token,
        title,
        body,
        status: 'failed',
        errorReason: error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to multiple users (batch)
   */
  static async sendBatchNotification({
    userIds,
    title,
    body,
    imageUrl = null,
    data = {},
    deepLink = null
  }) {
    try {
      console.log(`📤 Sending batch notification to ${userIds.length} users...`);

      // Get all users with tokens
      const placeholders = userIds.map(() => '?').join(',');
      const [users] = await pool.query(
        `SELECT id, email, fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL`,
        userIds
      );

      console.log(`📱 Found ${users.length} users with FCM tokens`);

      const results = {
        total: userIds.length,
        sent: 0,
        failed: 0,
        errors: []
      };

      // Send to each user (with rate limiting)
      for (let i = 0; i < users.length; i++) {
        const user = users[i];

        // Rate limit: 100 messages per second max
        if (i > 0 && i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const result = await this.sendRichNotification({
          userId: user.id,
          title,
          body,
          imageUrl,
          data,
          deepLink
        });

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            userId: user.id,
            error: result.error
          });
        }

        // Progress log every 50 messages
        if ((i + 1) % 50 === 0) {
          console.log(`📊 Progress: ${i + 1}/${users.length} sent`);
        }
      }

      console.log('✅ Batch notification completed:', results);

      // Update daily analytics
      await this.updateAnalytics(results);

      return results;

    } catch (error) {
      console.error('❌ Batch notification failed:', error);
      throw error;
    }
  }

  /**
   * Send notification to all drivers
   */
  static async sendToAllDrivers(title, body, data = {}) {
    try {
      const [drivers] = await pool.query(
        'SELECT id FROM users WHERE user_type = "driver"'
      );

      const driverIds = drivers.map(d => d.id);
      
      return await this.sendBatchNotification({
        userIds: driverIds,
        title,
        body,
        data: { ...data, type: 'driver_broadcast' }
      });

    } catch (error) {
      console.error('Failed to send to all drivers:', error);
      throw error;
    }
  }

  /**
   * Send notification to all passengers
   */
  static async sendToAllPassengers(title, body, data = {}) {
    try {
      const [passengers] = await pool.query(
        'SELECT id FROM users WHERE user_type = "passenger" OR user_type = "user"'
      );

      const passengerIds = passengers.map(p => p.id);
      
      return await this.sendBatchNotification({
        userIds: passengerIds,
        title,
        body,
        data: { ...data, type: 'passenger_broadcast' }
      });

    } catch (error) {
      console.error('Failed to send to all passengers:', error);
      throw error;
    }
  }

  /**
   * Sanitize data payload (FCM only accepts string values)
   */
  static sanitizeData(data) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      sanitized[key] = String(value);
    }
    return sanitized;
  }

  /**
   * Log notification delivery
   */
  static async logDelivery({
    userId,
    token,
    title,
    body,
    status,
    errorReason = null,
    messageId = null
  }) {
    try {
      await pool.query(`
        INSERT INTO notification_delivery_logs
        (user_id, fcm_token, notification_title, notification_body, delivery_status, error_reason, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [userId, token, title, body, status, errorReason]);
    } catch (error) {
      console.error('Failed to log delivery:', error.message);
    }
  }

  /**
   * Update daily analytics
   */
  static async updateAnalytics(results) {
    try {
      const today = new Date().toISOString().split('T')[0];

      await pool.query(`
        INSERT INTO notification_analytics 
        (date, total_sent, total_delivered, total_failed, delivery_rate)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          total_sent = total_sent + VALUES(total_sent),
          total_delivered = total_delivered + VALUES(total_delivered),
          total_failed = total_failed + VALUES(total_failed),
          delivery_rate = (total_delivered / total_sent) * 100
      `, [
        today,
        results.total,
        results.sent,
        results.failed,
        results.total > 0 ? (results.sent / results.total) * 100 : 0
      ]);

    } catch (error) {
      console.error('Failed to update analytics:', error.message);
    }
  }

  /**
   * Track notification open (call this when user opens notification)
   */
  static async trackNotificationOpen(userId, notificationId) {
    try {
      await pool.query(`
        UPDATE notification_delivery_logs
        SET delivery_status = 'opened', opened_at = NOW()
        WHERE user_id = ? AND id = ?
      `, [userId, notificationId]);

      // Update daily analytics
      const today = new Date().toISOString().split('T')[0];
      await pool.query(`
        UPDATE notification_analytics
        SET 
          total_opened = total_opened + 1,
          open_rate = (total_opened / total_sent) * 100
        WHERE date = ?
      `, [today]);

      console.log(`✅ Notification open tracked for user ${userId}`);

    } catch (error) {
      console.error('Failed to track open:', error.message);
    }
  }
}

module.exports = ImprovedFCMService;
