const cron = require('node-cron');
const FCMTokenValidator = require('../services/fcmTokenValidator');

/**
 * 🕐 Automated FCM Token Cleanup Job
 * Runs daily to clean invalid tokens
 */

class FCMCleanupJob {
  
  static start() {
    // DISABLED: Automatic token cleanup
    // Only clean tokens on explicit logout
    // Reason: Temporary validation failures (phone off, network issues) 
    // should NOT delete tokens for logged-in users
    
    console.log('⚠️ FCM automatic cleanup DISABLED');
    console.log('   Tokens will only be cleared on user logout');
    console.log('   Use FCMCleanupJob.runNow() for manual cleanup if needed');
    
    // ORIGINAL CODE (DISABLED):
    // cron.schedule('0 3 * * *', async () => {
    //   console.log('🕐 Starting scheduled FCM token cleanup...');
    //   const stats = await FCMTokenValidator.cleanInvalidTokens();
    //   ...
    // });
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
