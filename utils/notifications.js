const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // Use environment variable for credentials (Railway deployment)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://gwadar-online-bazaar-default-rtdb.firebaseio.com'
    });
  } else {
    // Fallback to file (local development)
    try {
      const serviceAccount = require('../firebase-service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://gwadar-online-bazaar-default-rtdb.firebaseio.com'
      });
    } catch (err) {
      console.warn('⚠️ Firebase service account not found. Push notifications disabled.');
    }
  }
}

/**
 * Send a push notification
 * @param {Object} options - Notification options
 * @param {string} options.token - FCM token of recipient
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data] - Optional data payload
 * @returns {Promise<void>}
 */
const sendNotification = async ({ token, title, body, data = {} }) => {
  try {
    if (!token) {
      console.warn('No FCM token provided. Notification not sent.');
      return;
    }
    
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        // Convert all values to strings as required by FCM
        ...Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
          return acc;
        }, {})
      },
      token,
      android: {
        priority: 'high',
        notification: {
          sound: 'notification', // Custom sound file: notification.mp3
          priority: 'high',
          channelId: 'cab_booking_channel_v4' // Match app channel ID v4
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      }
    };
    
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return response;
    
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send notifications to multiple users
 * @param {Object} options - Notification options
 * @param {Array<string>} options.tokens - FCM tokens of recipients
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data] - Optional data payload
 * @returns {Promise<Array>}
 */
const sendMulticastNotification = async ({ tokens, title, body, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.warn('No FCM tokens provided. Multicast notification not sent.');
      return [];
    }
    
    // Filter out empty tokens
    const validTokens = tokens.filter(token => token && token.trim() !== '');
    
    if (validTokens.length === 0) {
      console.warn('No valid FCM tokens provided. Multicast notification not sent.');
      return [];
    }
    
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        // Convert all values to strings as required by FCM
        ...Object.entries(data).reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
          return acc;
        }, {})
      },
      tokens: validTokens,
      android: {
        priority: 'high',
        notification: {
          sound: 'notification', // Custom sound file: notification.mp3
          priority: 'high',
          channelId: 'cab_booking_channel_v4' // Match app channel ID v4
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      }
    };
    
    const response = await admin.messaging().sendMulticast(message);
    console.log(`Multicast sent: ${response.successCount} successful, ${response.failureCount} failed`);
    return response;
    
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    throw error;
  }
};

module.exports = {
  sendNotification,
  sendMulticastNotification
};
