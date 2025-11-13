const admin = require('firebase-admin');
const { pool } = require('../config/db');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Load Firebase service account from file
    const serviceAccount = require('../firebase-service-account.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    console.error('Make sure firebase-service-account.json exists in backend directory');
  }

/**
 * Send order notification to all delivery boys
 */
async function sendOrderNotificationToDeliveryBoys(order) {
  try {
    const title = 'New Order to Deliver';
    const message = `Order #${order.id} - Rs ${order.totalAmount} ready for assignment`;

    // Fetch delivery boys with valid tokens
    const [rows] = await pool.query(`
      SELECT id, name, fcm_token FROM users
      WHERE user_type = 'd_boy' AND fcm_token IS NOT NULL AND fcm_token != ''
    `);

    if (!rows.length) {
      console.log('⚠️ No delivery boys with FCM token');
      return { success: false, message: 'No delivery boy tokens' };
    }

    const data = {
      type: 'new_order',
      route: 'delivery_orders',
      entity: 'order',
      order_id: order.id?.toString?.() || String(order.id),
      orderAmount: (order.totalAmount ?? order.total_amount ?? '').toString(),
      customerName: order.customer_name || order.userName || '',
    };

    let sent = 0, failed = 0;
    for (const u of rows) {
      const token = u.fcm_token;
      if (!token || token.length < 50) continue;
      try {
        const messageObj = {
          notification: { title, body: message },
          data: Object.fromEntries(Object.entries(data).map(([k,v]) => [k, String(v)])),
          token,
          android: {
            priority: 'high',
            notification: { channelId: 'cab_booking_channel_v4', sound: 'default' },
          },
        };
        await admin.messaging().send(messageObj);
        sent++;
      } catch (err) {
        console.error('❌ FCM to delivery boy failed:', err.message);
        failed++;
      }
    }

    console.log(`🚚 Delivery FCM done. sent=${sent} failed=${failed}`);
    return { success: sent > 0, sent, failed };
  } catch (e) {
    console.error('sendOrderNotificationToDeliveryBoys error', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Send FCM notification to admin users
 */
async function sendAdminNotification(title, message, data = {}) {
  try {
    console.log('📢 Sending admin notification:', { title, message });
    
    // Get all admin users
    const [adminUsers] = await pool.query(`
      SELECT id, name, fcm_token 
      FROM users 
      WHERE user_type = 'admin'
    `);
    
    if (adminUsers.length === 0) {
      console.log('⚠️ No admin users found');
      return { success: false, message: 'No admin users found' };
    }
    
    let successCount = 0;
    let failureCount = 0;
    
    // Try to send FCM notifications to admins with tokens
    const adminsWithTokens = adminUsers.filter(admin => 
      admin.fcm_token && 
      admin.fcm_token !== 'test_admin_fcm_token_12345' &&
      admin.fcm_token.length > 50 // Real FCM tokens are much longer
    );
    
    if (adminsWithTokens.length > 0) {
      try {
        const tokens = adminsWithTokens.map(admin => admin.fcm_token);
        console.log(`📱 Found ${tokens.length} real admin FCM tokens`);
        
        // Send individual notifications to avoid batch issues
        for (const token of tokens) {
          try {
            // Sanitize data payload: only string values are allowed in FCM data
            const extra = (data && typeof data === 'object') ? data : {};
            const dataPayload = {};
            for (const [key, value] of Object.entries(extra)) {
              if (value === undefined || value === null) continue;
              dataPayload[key] = String(value);
            }

            const fcmMessage = {
              notification: {
                title: title,
                body: message,
              },
              data: {
                type: 'admin_notification',
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                ...dataPayload,
              },
              token: token,
              android: {
                priority: 'high',
                notification: {
                  channelId: 'default',
                  priority: 'high',
                  defaultSound: true,
                  defaultVibrateTimings: true,
                  defaultLightSettings: true,
                },
              },
            };
            
            const response = await admin.messaging().send(fcmMessage);
            console.log(`✅ FCM notification sent to admin: ${response}`);
            successCount++;
          } catch (tokenError) {
            console.error(`❌ Failed to send to token: ${tokenError.message}`);
            failureCount++;
          }
        }
        
        console.log('✅ FCM notification batch completed:', {
          successCount,
          failureCount,
        });
        
      } catch (fcmError) {
        console.error('❌ FCM sending failed:', fcmError.message);
        failureCount = adminsWithTokens.length;
      }
    } else {
      console.log('⚠️ No real FCM tokens found, using fallback notification');
    }
    
    // Always store notification in database for admin panel
    await storeNotificationHistory(title, message, ['admin'], {
      success: successCount,
      failure: failureCount,
    });
    
    // Create notification entries for each admin user
    for (const admin of adminUsers) {
      try {
        await pool.query(`
          INSERT INTO user_notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'order_update')
        `, [admin.id, title, message]);
        console.log(`✅ Database notification created for admin ${admin.name}`);
      } catch (dbError) {
        console.error(`❌ Failed to create notification for admin ${admin.name}:`, dbError.message);
      }
    }
    
    return {
      success: true,
      successCount: successCount + adminUsers.length, // Include database notifications
      failureCount: failureCount,
      message: `Notification sent to ${adminUsers.length} admin(s) via database${successCount > 0 ? ` and ${successCount} via FCM` : ''}`
    };
  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Store notification in database for history
 */
async function storeNotificationHistory(title, message, recipients, results = null, imageUrl = null) {
  try {
    // Deprecated: We no longer write to legacy 'notifications' table.
    // History and bell entries are maintained in 'user_notifications'.
    console.log('ℹ️ storeNotificationHistory noop: using user_notifications only');
  } catch (error) {
    console.error('❌ Error storing notification history:', error);
  }
}

/**
 * Send order notification to admin
 */
async function sendOrderNotificationToAdmin(order) {
  const title = 'New Order Received';
  const message = `Order #${order.id} - Rs ${order.totalAmount} from ${order.customer_name || 'Customer'}`;
  
  const data = {
    // Explicit navigation hints for mobile app
    type: 'new_order',
    route: 'admin_orders',
    entity: 'order',
    order_id: order.id?.toString?.() || String(order.id),

    // Legacy/extra fields
    orderId: order.id?.toString?.() || String(order.id),
    orderAmount: (order.totalAmount ?? order.total_amount ?? '').toString(),
    customerName: order.customer_name || order.userName || '',
  };
  
  return await sendAdminNotification(title, message, data);
}

module.exports = {
  sendAdminNotification,
  sendOrderNotificationToAdmin,
  sendOrderNotificationToDeliveryBoys,
  storeNotificationHistory,
};
