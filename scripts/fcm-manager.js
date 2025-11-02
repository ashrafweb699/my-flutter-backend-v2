#!/usr/bin/env node

/**
 * 🎯 FCM Manager - Command Line Tool
 * Quick management of FCM tokens and notifications
 */

const FCMTokenValidator = require('../services/fcmTokenValidator');
const ImprovedFCMService = require('../services/improvedFCMService');
const { pool } = require('../config/db');

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('🔥 FCM Manager\n');

  switch (command) {
    case 'cleanup':
      await runCleanup();
      break;
    
    case 'stats':
      await showStats();
      break;
    
    case 'test':
      await testNotification(args[1], args[2]);
      break;
    
    case 'validate':
      await validateToken(args[1]);
      break;
    
    case 'broadcast':
      await broadcastNotification(args[1], args[2], args[3]);
      break;
    
    case 'help':
    default:
      showHelp();
      break;
  }

  process.exit(0);
}

async function runCleanup() {
  console.log('🧹 Running token cleanup...\n');
  const stats = await FCMTokenValidator.cleanInvalidTokens();
  
  console.log('\n📊 Cleanup Results:');
  console.log(`   Total tokens: ${stats.total}`);
  console.log(`   ✅ Valid: ${stats.valid}`);
  console.log(`   ❌ Invalid: ${stats.invalid}`);
  console.log(`   🧹 Cleaned: ${stats.cleaned}`);
}

async function showStats() {
  console.log('📊 Fetching statistics...\n');
  const stats = await FCMTokenValidator.getTokenHealthStats();
  
  console.log('Token Health:');
  console.log(`   Total with tokens: ${stats.totalWithTokens}`);
  console.log(`   Validated (7 days): ${stats.validatedLast7Days}`);
  console.log(`   Invalidated (7 days): ${stats.invalidatedLast7Days}`);
  console.log(`   Health %: ${stats.healthPercentage}%`);
  
  // Get recent analytics
  const [analytics] = await pool.query(`
    SELECT * FROM notification_analytics
    WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    ORDER BY date DESC
  `);
  
  if (analytics.length > 0) {
    console.log('\n📈 Recent Analytics (Last 7 Days):');
    analytics.forEach(row => {
      console.log(`   ${row.date}: ${row.total_sent} sent, ${row.delivery_rate}% delivered, ${row.open_rate}% opened`);
    });
  }
}

async function testNotification(userId, token) {
  if (!userId || !token) {
    console.log('❌ Usage: node fcm-manager.js test <userId> <token>');
    return;
  }

  console.log(`🔔 Sending test notification to user ${userId}...\n`);
  const result = await FCMTokenValidator.sendTestNotification(token);
  
  if (result.success) {
    console.log(`✅ Test notification sent successfully!`);
    console.log(`   Message ID: ${result.messageId}`);
  } else {
    console.log(`❌ Test notification failed: ${result.error}`);
  }
}

async function validateToken(token) {
  if (!token) {
    console.log('❌ Usage: node fcm-manager.js validate <token>');
    return;
  }

  console.log('🔍 Validating token...\n');
  const result = await FCMTokenValidator.validateToken(token);
  
  if (result.valid) {
    console.log(`✅ Token is VALID`);
  } else {
    console.log(`❌ Token is INVALID`);
    console.log(`   Reason: ${result.reason}`);
  }
}

async function broadcastNotification(userType, title, body) {
  if (!userType || !title || !body) {
    console.log('❌ Usage: node fcm-manager.js broadcast <drivers|passengers> "Title" "Body"');
    return;
  }

  console.log(`📢 Broadcasting to ${userType}...\n`);
  
  let result;
  if (userType === 'drivers') {
    result = await ImprovedFCMService.sendToAllDrivers(title, body);
  } else if (userType === 'passengers') {
    result = await ImprovedFCMService.sendToAllPassengers(title, body);
  } else {
    console.log('❌ Invalid user type. Use "drivers" or "passengers"');
    return;
  }

  console.log('\n📊 Broadcast Results:');
  console.log(`   Total users: ${result.total}`);
  console.log(`   ✅ Sent: ${result.sent}`);
  console.log(`   ❌ Failed: ${result.failed}`);
}

function showHelp() {
  console.log('Usage: node fcm-manager.js <command> [options]\n');
  console.log('Commands:');
  console.log('  cleanup                           - Clean all invalid tokens');
  console.log('  stats                             - Show token health statistics');
  console.log('  test <userId> <token>             - Send test notification');
  console.log('  validate <token>                  - Validate a single token');
  console.log('  broadcast <type> "Title" "Body"   - Broadcast to drivers/passengers');
  console.log('  help                              - Show this help message\n');
  console.log('Examples:');
  console.log('  node fcm-manager.js cleanup');
  console.log('  node fcm-manager.js stats');
  console.log('  node fcm-manager.js test 123 "fcm_token_here"');
  console.log('  node fcm-manager.js broadcast drivers "Update" "New feature available"');
}

// Run main function
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
