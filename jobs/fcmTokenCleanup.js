const cron = require('node-cron');
const FCMTokenValidator = require('../services/fcmTokenValidator');

/**
 * 🕐 Automated FCM Token Cleanup Job
 * Runs daily to clean invalid tokens
 */

class FCMCleanupJob {
  
  static start() {
    // Run every day at 3 AM
    cron.schedule('0 3 * * *', async () => {
      console.log('🕐 Starting scheduled FCM token cleanup...');
      
      try {
        const stats = await FCMTokenValidator.cleanInvalidTokens();
        
        console.log('✅ Scheduled cleanup completed:', {
          total: stats.total,
          valid: stats.valid,
          invalid: stats.invalid,
          cleaned: stats.cleaned
        });

        // Send report to admin if significant issues found
        if (stats.cleaned > 10) {
          await this.sendCleanupReport(stats);
        }

      } catch (error) {
        console.error('❌ Scheduled cleanup failed:', error);
      }
    });

    console.log('✅ FCM cleanup job scheduled (daily at 3 AM)');
  }

  static async sendCleanupReport(stats) {
    try {
      const ImprovedFCMService = require('../services/improvedFCMService');
      
      await ImprovedFCMService.sendToAllDrivers(
        '🔧 System Maintenance',
        `Cleaned ${stats.cleaned} invalid notification tokens. Your notifications should work better now!`,
        { type: 'system_maintenance' }
      );

      console.log('📧 Cleanup report sent to admins');
    } catch (error) {
      console.error('Failed to send cleanup report:', error);
    }
  }

  // Manual trigger for testing
  static async runNow() {
    console.log('🔄 Running manual token cleanup...');
    return await FCMTokenValidator.cleanInvalidTokens();
  }
}

module.exports = FCMCleanupJob;

// Start job if this file is run directly
if (require.main === module) {
  FCMCleanupJob.start();
  console.log('FCM cleanup job started. Press Ctrl+C to exit.');
}
