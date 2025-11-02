const admin = require('firebase-admin');
const { pool } = require('../config/db');

/**
 * 🔍 FCM Token Validator Service
 * Validates tokens, cleans invalid tokens, tracks token health
 */

class FCMTokenValidator {
  
  /**
   * Validate if a single FCM token is still valid
   * @param {string} token - FCM token to validate
   * @returns {Promise<{valid: boolean, reason: string}>}
   */
  static async validateToken(token) {
    if (!token || token.length < 50) {
      return { valid: false, reason: 'token_too_short' };
    }

    // Check for test tokens
    if (token.includes('test_') || token.includes('dummy_')) {
      return { valid: false, reason: 'test_token' };
    }

    try {
      // Try to send a dry-run message to validate token
      const message = {
        token: token,
        data: {
          test: 'validation'
        },
        android: {
          priority: 'high',
        },
      };

      // Use dryRun to validate without actually sending
      await admin.messaging().send(message, true); // dryRun = true
      
      console.log(`✅ Token validated: ${token.substring(0, 20)}...`);
      return { valid: true, reason: 'active' };
      
    } catch (error) {
      console.log(`❌ Token invalid: ${error.code}`);
      
      // Categorize error reasons
      const reason = this.categorizeError(error);
      return { valid: false, reason };
    }
  }

  /**
   * Categorize FCM error for better tracking
   */
  static categorizeError(error) {
    const errorCode = error.code || '';
    
    if (errorCode.includes('registration-token-not-registered')) {
      return 'unregistered';
    }
    if (errorCode.includes('invalid-registration-token')) {
      return 'invalid_format';
    }
    if (errorCode.includes('mismatched-credential')) {
      return 'wrong_project';
    }
    if (errorCode.includes('server-unavailable')) {
      return 'fcm_server_down';
    }
    
    return 'unknown_error';
  }

  /**
   * Validate all tokens in database and clean invalid ones
   * @returns {Promise<{total: number, valid: number, invalid: number, cleaned: number}>}
   */
  static async cleanInvalidTokens() {
    console.log('🧹 Starting token cleanup...');
    
    try {
      // Get all users with FCM tokens
      const [users] = await pool.query(`
        SELECT id, email, fcm_token, user_type, updated_at
        FROM users
        WHERE fcm_token IS NOT NULL 
        AND fcm_token != ''
      `);

      console.log(`📊 Found ${users.length} users with tokens`);

      const stats = {
        total: users.length,
        valid: 0,
        invalid: 0,
        cleaned: 0,
        errors: []
      };

      // Validate each token (with rate limiting)
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        // Rate limit: validate max 10 tokens per second
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const result = await this.validateToken(user.fcm_token);

        if (result.valid) {
          stats.valid++;
          
          // Update last_validated timestamp
          await pool.query(`
            UPDATE users 
            SET fcm_token_validated_at = NOW()
            WHERE id = ?
          `, [user.id]);
          
        } else {
          stats.invalid++;
          
          // Log invalid token
          console.log(`❌ Invalid token for user ${user.email}: ${result.reason}`);
          stats.errors.push({
            userId: user.id,
            email: user.email,
            reason: result.reason
          });

          // Clean the invalid token
          await pool.query(`
            UPDATE users 
            SET fcm_token = NULL,
                fcm_token_invalidated_at = NOW()
            WHERE id = ?
          `, [user.id]);
          
          stats.cleaned++;
        }

        // Progress log every 50 tokens
        if ((i + 1) % 50 === 0) {
          console.log(`📊 Progress: ${i + 1}/${users.length} tokens validated`);
        }
      }

      // Log results to token_health table
      await this.logHealthCheck(stats);

      console.log('✅ Token cleanup completed:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Token cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Log token health check results
   */
  static async logHealthCheck(stats) {
    try {
      await pool.query(`
        INSERT INTO fcm_token_health_logs 
        (total_tokens, valid_tokens, invalid_tokens, cleaned_tokens, check_date)
        VALUES (?, ?, ?, ?, NOW())
      `, [stats.total, stats.valid, stats.invalid, stats.cleaned]);
    } catch (error) {
      console.log('⚠️ Could not log health check:', error.message);
      // Non-critical, continue
    }
  }

  /**
   * Get token health statistics
   */
  static async getTokenHealthStats() {
    try {
      const [totalUsers] = await pool.query(`
        SELECT COUNT(*) as total FROM users WHERE fcm_token IS NOT NULL
      `);

      const [recentlyValidated] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE fcm_token_validated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      const [recentlyInvalidated] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE fcm_token_invalidated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      return {
        totalWithTokens: totalUsers[0].total,
        validatedLast7Days: recentlyValidated[0].count,
        invalidatedLast7Days: recentlyInvalidated[0].count,
        healthPercentage: totalUsers[0].total > 0 
          ? ((recentlyValidated[0].count / totalUsers[0].total) * 100).toFixed(2)
          : 0
      };
    } catch (error) {
      console.error('❌ Failed to get token health stats:', error);
      return null;
    }
  }

  /**
   * Send test notification to validate token works end-to-end
   */
  static async sendTestNotification(token) {
    try {
      const message = {
        notification: {
          title: '🔔 Test Notification',
          body: 'Your notifications are working correctly!',
        },
        data: {
          type: 'test',
          timestamp: Date.now().toString()
        },
        token: token,
        android: {
          priority: 'high',
          notification: {
            channelId: 'high_importance_channel',
            priority: 'max',
            defaultSound: true,
            defaultVibrateTimings: true,
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`✅ Test notification sent: ${response}`);
      return { success: true, messageId: response };
      
    } catch (error) {
      console.error(`❌ Test notification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = FCMTokenValidator;
