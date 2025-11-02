const admin = require('firebase-admin');
const { pool } = require('../config/db');

// Get Firestore instance
const db = admin.firestore ? admin.firestore() : null;

// Send a notification to selected user types
exports.sendNotification = async (req, res) => {
    try {
        const { title, message: bodyText, imageUrl, recipients, data } = req.body;

        console.log('📢 Send notification request:', { title, message: bodyText, recipients, data });

        if (!title || !bodyText || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ error: 'Missing required fields or invalid recipients' });
        }

        // Check if Firebase Admin SDK is initialized
        if (!admin.apps.length) {
            try {
                admin.initializeApp({
                    credential: admin.credential.cert(require('../firebase-service-account.json')),
                });
                console.log('✅ Firebase Admin SDK initialized');
            } catch (error) {
                console.error('❌ Firebase Admin SDK initialization failed:', error.message);
                return res.status(500).json({ error: 'Firebase not initialized', details: error.message });
            }
        }
        
        // Verify messaging is available
        if (!admin.messaging) {
            console.error('❌ Firebase messaging not available');
            return res.status(500).json({ error: 'Firebase messaging not available' });
        }

        // Track success and failure counts
        const results = {
            success: 0,
            failure: 0,
            errors: []
        };

        // Process each recipient type
        for (const recipientType of recipients) {
            let tokens = [];
            
            console.log(`\n🔍 Processing recipient: ${recipientType}`);
            
            // Check if this is a specific user/driver token (e.g., "user_5", "driver_3")
            if (recipientType.startsWith('user_')) {
                const userId = recipientType.split('_')[1];
                console.log(`📱 Fetching token for specific user: ${userId}`);
                tokens = await getSpecificUserToken(userId);
                console.log(`📱 Got ${tokens.length} token(s) for user ${userId}`);
            } else if (recipientType.startsWith('driver_')) {
                const driverId = recipientType.split('_')[1];
                console.log(`📱 Fetching token for specific driver: ${driverId}`);
                tokens = await getSpecificDriverToken(driverId);
                console.log(`📱 Got ${tokens.length} token(s) for driver ${driverId}`);
            } else {
                // Get tokens based on recipient group type
                switch (recipientType) {
                    case 'users':
                        tokens = await getUserTokens();
                        break;
                    case 'drivers':
                        tokens = await getDriverTokens();
                        break;
                    case 'shopkeepers':
                        tokens = await getShopkeeperTokens();
                        break;
                    case 'bus_managers':
                        tokens = await getBusManagerTokens();
                        break;
                    default:
                        console.warn(`Unknown recipient type: ${recipientType}`);
                        continue;
                }
            }

            if (tokens.length === 0) {
                console.warn(`⚠️ No FCM tokens found for ${recipientType} - skipping`);
                continue;
            }
            
            console.log(`✅ Proceeding to send notification to ${tokens.length} token(s) for ${recipientType}`);

            // Prepare notification payload with proper data and Android config
            const notificationData = {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                ...(data || {}), // Include custom data from request
            };

            // Convert all data values to strings (FCM requirement)
            Object.keys(notificationData).forEach(key => {
                if (notificationData[key] !== null && notificationData[key] !== undefined) {
                    notificationData[key] = String(notificationData[key]);
                }
            });

            const payload = {
                notification: {
                    title: title,
                    body: bodyText,
                },
                data: notificationData,
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'cab_booking_channel_v4', // Updated to v4
                        sound: 'notification',
                        priority: 'high',
                        defaultSound: false,
                        defaultVibrateTimings: false,
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'notification.mp3',
                            contentAvailable: true,
                        }
                    }
                }
            };

            // Add image URL if provided
            if (imageUrl) {
                payload.notification.imageUrl = imageUrl;
                payload.data.imageUrl = imageUrl;
            }

            // Send to topic if there are many tokens to avoid payload size limits
            if (tokens.length > 500) {
                try {
                    // Send to topic instead (all users must be subscribed to this topic)
                    await admin.messaging().sendToTopic(recipientType, payload);
                    results.success += tokens.length;
                    console.log(`Sent notification to ${tokens.length} ${recipientType} via topic`);
                } catch (error) {
                    results.failure += tokens.length;
                    results.errors.push(`Error sending to ${recipientType} topic: ${error.message}`);
                    console.error(`Error sending to ${recipientType} topic:`, error);
                }
            } else {
                // Send to individual tokens in batches of 500
                const batches = [];
                for (let i = 0; i < tokens.length; i += 500) {
                    batches.push(tokens.slice(i, i + 500));
                }

                for (const batch of batches) {
                    try {
                        console.log(`📤 Sending FCM to ${batch.length} tokens for ${recipientType}...`);
                        
                        // Check if sendMulticast is available
                        const messaging = admin.messaging();
                        if (typeof messaging.sendMulticast === 'function') {
                            // Use sendMulticast (newer method)
                            const multicast = { ...payload, tokens: batch };
                            const response = await messaging.sendMulticast(multicast);
                            results.success += response.successCount;
                            results.failure += response.failureCount;
                            
                            console.log(`✅ FCM sent to ${recipientType}: Success=${response.successCount}, Failure=${response.failureCount}`);
                            
                            // Log failures for debugging
                            if (response.failureCount > 0 && response.responses) {
                                response.responses.forEach((resp, idx) => {
                                    if (!resp.success) {
                                        console.error(`❌ Failed to send to token ${idx}: ${resp.error?.message || 'Unknown error'}`);
                                    }
                                });
                            }
                        } else if (typeof messaging.sendEach === 'function') {
                            // Fallback to sendEach (older method)
                            console.log('⚠️ Using sendEach fallback (sendMulticast not available)');
                            const messages = batch.map(token => ({ ...payload, token }));
                            const response = await messaging.sendEach(messages);
                            results.success += response.successCount;
                            results.failure += response.failureCount;
                            
                            console.log(`✅ FCM sent to ${recipientType}: Success=${response.successCount}, Failure=${response.failureCount}`);
                        } else {
                            // Send one by one as last resort
                            console.log('⚠️ Using send() fallback (batch methods not available)');
                            for (const token of batch) {
                                try {
                                    await messaging.send({ ...payload, token });
                                    results.success++;
                                } catch (err) {
                                    results.failure++;
                                    console.error(`❌ Failed to send to token: ${err.message}`);
                                }
                            }
                        }
                    } catch (error) {
                        results.failure += batch.length;
                        results.errors.push(`Error sending to ${batch.length} ${recipientType}: ${error.message}`);
                        console.error(`❌ FCM Error for ${recipientType}:`, error.message);
                    }
                }
            }
        }

        // Save notification to database
        const notificationDoc = {
            title,
            message: bodyText,
            imageUrl: imageUrl || null,
            recipients,
            sentAt: new Date(),
            results: {
                success: results.success,
                failure: results.failure
            }
        };

        // Save to Firestore if available
        if (db) {
            try {
                await db.collection('notifications').add(notificationDoc);
                console.log('✅ Notification saved to Firestore');
            } catch (firestoreError) {
                console.warn('⚠️ Failed to save notification to Firestore:', firestoreError.message);
            }
        }

        console.log(`📊 Final results: Success=${results.success}, Failure=${results.failure}`);

        return res.status(200).json({ 
            message: 'Notifications sent',
            results
        });
    } catch (error) {
        console.error('Error in sendNotification:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// Helper functions to get tokens from MySQL database
async function getUserTokens() {
    try {
        const [rows] = await pool.query(
            "SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != '' AND user_type = 'user'"
        );
        return rows.map(r => r.fcm_token).filter(Boolean);
    } catch (error) {
        console.error('Error getting user tokens:', error);
        return [];
    }
}

async function getDriverTokens() {
    try {
        // Get all driver FCM tokens from users table (where user_type = 'driver')
        const [rows] = await pool.query(
            "SELECT fcm_token FROM users WHERE fcm_token IS NOT NULL AND fcm_token != '' AND user_type = 'driver'"
        );
        return rows.map(r => r.fcm_token).filter(Boolean);
    } catch (error) {
        console.error('Error getting driver tokens:', error);
        return [];
    }
}

async function getShopkeeperTokens() {
    try {
        const [rows] = await pool.query(
            'SELECT fcm_token FROM shopkeepers WHERE fcm_token IS NOT NULL AND fcm_token != \'\''
        );
        return rows.map(r => r.fcm_token).filter(Boolean);
    } catch (error) {
        console.error('Error getting shopkeeper tokens:', error);
        return [];
    }
}

async function getBusManagerTokens() {
    try {
        const [rows] = await pool.query(
            'SELECT fcm_token FROM bus_managers WHERE fcm_token IS NOT NULL AND fcm_token != \'\''
        );
        return rows.map(r => r.fcm_token).filter(Boolean);
    } catch (error) {
        console.error('Error getting bus manager tokens:', error);
        return [];
    }
}

// Get token for specific user by ID
async function getSpecificUserToken(userId) {
    try {
        const [rows] = await pool.query(
            'SELECT fcm_token FROM users WHERE id = ? AND fcm_token IS NOT NULL AND fcm_token != \'\'',
            [userId]
        );
        const tokens = rows.map(r => r.fcm_token).filter(Boolean);
        if (tokens.length > 0) {
            console.log(`✅ Found FCM token for user ${userId}: ${tokens[0].substring(0, 20)}...`);
        } else {
            console.log(`❌ No FCM token found for user ${userId}`);
        }
        return tokens;
    } catch (error) {
        console.error(`Error getting token for user ${userId}:`, error);
        return [];
    }
}

// Get token for specific driver by ID
async function getSpecificDriverToken(driverId) {
    try {
        // Get driver FCM token from users table (drivers are users with user_type='driver')
        const [rows] = await pool.query(
            'SELECT fcm_token FROM users WHERE id = ? AND user_type = \'driver\' AND fcm_token IS NOT NULL AND fcm_token != \'\'',
            [driverId]
        );
        
        const tokens = rows.map(r => r.fcm_token).filter(Boolean);
        if (tokens.length > 0) {
            console.log(`✅ Found FCM token for driver ${driverId} in users table: ${tokens[0].substring(0, 20)}...`);
        } else {
            console.log(`❌ No FCM token found for driver ${driverId} in users table`);
        }
        return tokens;
    } catch (error) {
        console.error(`Error getting token for driver ${driverId}:`, error);
        return [];
    }
}

// Get all notifications (for admin panel)
exports.getAllNotifications = async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({ error: 'Firestore not available' });
        }

        const snapshot = await db.collection('notifications')
            .orderBy('sentAt', 'desc')
            .get();

        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return res.status(200).json(notifications);
    } catch (error) {
        console.error('Error getting notifications:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};