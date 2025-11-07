const { pool } = require('../config/db');
const admin = require('firebase-admin');

/**
 * Send call notification to specific user
 * Used for voice and video calls
 */
exports.sendCallNotification = async (req, res) => {
  try {
    const callerId = req.user.id;
    const { receiverId, callType, roomId, conversationId } = req.body;

    console.log(`📞 Sending ${callType} call notification from ${callerId} to ${receiverId}`);

    // Validate input
    if (!receiverId || !callType || !roomId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: receiverId, callType, roomId'
      });
    }

    // Get caller details
    const [callerData] = await pool.query(
      `SELECT u.name, u.user_type, up.user_image 
       FROM users u 
       LEFT JOIN user_profile up ON u.id = up.user_id 
       WHERE u.id = ?`,
      [callerId]
    );

    if (callerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Caller not found'
      });
    }

    const caller = callerData[0];
    const callerName = caller.name || 'Someone';

    // Get receiver's FCM token
    const [receiverData] = await pool.query(
      'SELECT fcm_token, name FROM users WHERE id = ?',
      [receiverId]
    );

    if (receiverData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const fcmToken = receiverData[0].fcm_token;

    if (!fcmToken) {
      console.log(`⚠️ No FCM token found for user ${receiverId}`);
      return res.status(400).json({
        success: false,
        message: 'Receiver does not have FCM token'
      });
    }

    // Prepare notification message
    const notificationTitle = callType === 'video' 
      ? `📹 Incoming Video Call` 
      : `📞 Incoming Voice Call`;
    const notificationBody = `${callerName} is calling you...`;

    // Send high-priority FCM notification
    const fcmMessage = {
      token: fcmToken,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      data: {
        type: 'incoming_call',
        callType: callType,
        callerId: callerId.toString(),
        callerName: callerName,
        callerImage: caller.user_image || '',
        roomId: roomId,
        conversationId: conversationId ? conversationId.toString() : '',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'incoming_calls',
          sound: 'ringtone',
          priority: 'max',
          visibility: 'public',
          importance: 'max',
          tag: `call_${roomId}`, // Unique tag for this call
          // Full screen intent for incoming calls
          fullScreenIntent: true,
        },
        ttl: 30000, // 30 seconds TTL for call notifications
      },
      apns: {
        headers: {
          'apns-priority': '10', // High priority
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: notificationTitle,
              body: notificationBody,
            },
            sound: 'ringtone.mp3',
            badge: 1,
            'content-available': 1,
            category: 'INCOMING_CALL',
          },
        },
      },
    };

    // Send FCM notification
    const response = await admin.messaging().send(fcmMessage);
    console.log(`✅ Call notification sent to user ${receiverId}: ${response}`);

    // Log call attempt in database (optional)
    try {
      await pool.query(
        `INSERT INTO call_logs (caller_id, receiver_id, call_type, room_id, status, created_at) 
         VALUES (?, ?, ?, ?, 'initiated', NOW())`,
        [callerId, receiverId, callType, roomId]
      );
    } catch (logError) {
      console.error('⚠️ Error logging call:', logError);
      // Don't fail the notification if logging fails
    }

    res.status(200).json({
      success: true,
      message: 'Call notification sent successfully',
      messageId: response
    });

  } catch (error) {
    console.error('❌ Error sending call notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send call notification',
      error: error.message
    });
  }
};

/**
 * Cancel call notification
 * Used when caller cancels the call
 */
exports.cancelCallNotification = async (req, res) => {
  try {
    const callerId = req.user.id;
    const { receiverId, roomId } = req.body;

    console.log(`📞 Cancelling call notification for room ${roomId}`);

    // Get receiver's FCM token
    const [receiverData] = await pool.query(
      'SELECT fcm_token FROM users WHERE id = ?',
      [receiverId]
    );

    if (receiverData.length > 0 && receiverData[0].fcm_token) {
      const fcmToken = receiverData[0].fcm_token;

      // Send cancellation notification
      const fcmMessage = {
        token: fcmToken,
        data: {
          type: 'call_cancelled',
          roomId: roomId,
          callerId: callerId.toString(),
        },
        android: {
          priority: 'high',
        },
      };

      await admin.messaging().send(fcmMessage);
      console.log(`✅ Call cancellation sent to user ${receiverId}`);
    }

    // Update call log
    try {
      await pool.query(
        `UPDATE call_logs 
         SET status = 'cancelled', ended_at = NOW() 
         WHERE room_id = ? AND status = 'initiated'`,
        [roomId]
      );
    } catch (logError) {
      console.error('⚠️ Error updating call log:', logError);
    }

    res.status(200).json({
      success: true,
      message: 'Call cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Error cancelling call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel call',
      error: error.message
    });
  }
};

/**
 * Update call status
 * Used when call is answered, rejected, or ended
 */
exports.updateCallStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId, status } = req.body;

    console.log(`📞 Updating call status for room ${roomId}: ${status}`);

    // Valid statuses: answered, rejected, ended, missed
    const validStatuses = ['answered', 'rejected', 'ended', 'missed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update call log
    await pool.query(
      `UPDATE call_logs 
       SET status = ?, ended_at = NOW() 
       WHERE room_id = ? AND status IN ('initiated', 'answered')`,
      [status, roomId]
    );

    res.status(200).json({
      success: true,
      message: 'Call status updated'
    });

  } catch (error) {
    console.error('❌ Error updating call status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update call status',
      error: error.message
    });
  }
};
