const { pool } = require('../config/db');

/**
 * Get all conversations for a user
 * Returns list of conversations with last message and unread count
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📱 Fetching conversations for user:', userId);

    const [conversations] = await pool.query(`
      SELECT 
        c.*,
        u.name as other_user_name,
        u.user_type as other_user_type,
        up.user_image as other_user_image,
        u.email as other_user_email
      FROM conversations c
      JOIN users u ON c.other_user_id = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE c.user_id = ?
      ORDER BY c.last_message_time DESC
    `, [userId]);

    console.log(`✅ Found ${conversations.length} conversations`);

    res.status(200).json({
      success: true,
      conversations: conversations
    });

  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
};

/**
 * Get or create a conversation between two users
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;

    console.log(`📱 Getting/creating conversation between ${userId} and ${otherUserId}`);

    // Check if conversation already exists
    let [conversations] = await pool.query(`
      SELECT * FROM conversations 
      WHERE user_id = ? AND other_user_id = ?
    `, [userId, otherUserId]);

    let conversation;

    if (conversations.length === 0) {
      // Create new conversation for both users
      const isAdmin = req.user.user_type === 'admin';
      
      // Check if other user is admin
      const [otherUser] = await pool.query('SELECT user_type FROM users WHERE id = ?', [otherUserId]);
      const isOtherUserAdmin = otherUser.length > 0 && otherUser[0].user_type === 'admin';

      // Create conversation for user 1
      await pool.query(`
        INSERT INTO conversations (user_id, other_user_id, is_admin_conversation)
        VALUES (?, ?, ?)
      `, [userId, otherUserId, isOtherUserAdmin ? 1 : 0]);

      // Create conversation for user 2 (reverse)
      await pool.query(`
        INSERT INTO conversations (user_id, other_user_id, is_admin_conversation)
        VALUES (?, ?, ?)
      `, [otherUserId, userId, isAdmin ? 1 : 0]);

      // Fetch the created conversation
      [conversations] = await pool.query(`
        SELECT * FROM conversations 
        WHERE user_id = ? AND other_user_id = ?
      `, [userId, otherUserId]);

      conversation = conversations[0];
      console.log('✅ Created new conversation:', conversation.id);
    } else {
      conversation = conversations[0];
      console.log('✅ Found existing conversation:', conversation.id);
    }

    // Get other user details
    const [otherUserDetails] = await pool.query(`
      SELECT u.id, u.name, u.user_type, u.email, up.user_image
      FROM users u
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE u.id = ?
    `, [otherUserId]);

    res.status(200).json({
      success: true,
      conversation: {
        ...conversation,
        other_user: otherUserDetails[0]
      }
    });

  } catch (error) {
    console.error('❌ Error getting/creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get/create conversation',
      error: error.message
    });
  }
};

/**
 * Get all messages in a conversation
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`📱 Fetching messages for conversation ${conversationId}`);

    // Verify user has access to this conversation (either as user_id or other_user_id)
    const [conversations] = await pool.query(`
      SELECT * FROM conversations 
      WHERE id = ? AND (user_id = ? OR other_user_id = ?)
    `, [conversationId, userId, userId]);

    if (conversations.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Get messages
    const [messages] = await pool.query(`
      SELECT 
        m.*,
        s.name as sender_name,
        s.user_type as sender_type,
        sup.user_image as sender_image,
        r.name as receiver_name
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      LEFT JOIN user_profile sup ON s.id = sup.user_id
      JOIN users r ON m.receiver_id = r.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [conversationId, limit, offset]);

    // Mark messages as read
    await pool.query(`
      UPDATE messages 
      SET is_read = 1, read_at = NOW()
      WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0
    `, [conversationId, userId]);

    // Update unread count
    await pool.query(`
      UPDATE conversations 
      SET unread_count = 0
      WHERE id = ? AND user_id = ?
    `, [conversationId, userId]);

    console.log(`✅ Found ${messages.length} messages`);

    res.status(200).json({
      success: true,
      messages: messages.reverse() // Reverse to show oldest first
    });

  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
};

/**
 * Send a new message
 */
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { messageText, messageType = 'text', mediaUrl } = req.body;

    console.log(`📱 Sending message in conversation ${conversationId}`);

    // Verify user has access to this conversation (either as user_id or other_user_id)
    const [conversations] = await pool.query(`
      SELECT * FROM conversations 
      WHERE id = ? AND (user_id = ? OR other_user_id = ?)
    `, [conversationId, userId, userId]);

    if (conversations.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    const conversation = conversations[0];
    // Determine receiver based on who is sending
    const receiverId = conversation.user_id === userId 
      ? conversation.other_user_id 
      : conversation.user_id;

    // Insert message
    const [result] = await pool.query(`
      INSERT INTO messages (
        conversation_id, sender_id, receiver_id, 
        message_text, message_type, media_url, is_delivered
      )
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [conversationId, userId, receiverId, messageText, messageType, mediaUrl]);

    const messageId = result.insertId;

    // Update both conversations (sender and receiver)
    await pool.query(`
      UPDATE conversations 
      SET 
        last_message = ?,
        last_message_time = NOW(),
        last_message_sender_id = ?
      WHERE (user_id = ? AND other_user_id = ?) 
         OR (user_id = ? AND other_user_id = ?)
    `, [messageText, userId, userId, receiverId, receiverId, userId]);

    // Increment unread count for receiver
    await pool.query(`
      UPDATE conversations 
      SET unread_count = unread_count + 1
      WHERE user_id = ? AND other_user_id = ?
    `, [receiverId, userId]);

    // Get the created message with sender info
    const [messages] = await pool.query(`
      SELECT 
        m.*,
        s.name as sender_name,
        s.user_type as sender_type,
        sup.user_image as sender_image
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      LEFT JOIN user_profile sup ON s.id = sup.user_id
      WHERE m.id = ?
    `, [messageId]);

    console.log('✅ Message sent successfully:', messageId);

    // Emit socket event if socket.io is available
    if (req.app.get('io')) {
      req.app.get('io').emit('new_message', {
        conversationId: conversationId,
        message: messages[0],
        receiverId: receiverId
      });
    }

    res.status(201).json({
      success: true,
      message: messages[0]
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * Mark messages as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    console.log(`📱 Marking messages as read in conversation ${conversationId}`);

    // Update messages
    await pool.query(`
      UPDATE messages 
      SET is_read = 1, read_at = NOW()
      WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0
    `, [conversationId, userId]);

    // Update conversation unread count
    await pool.query(`
      UPDATE conversations 
      SET unread_count = 0
      WHERE id = ? AND user_id = ?
    `, [conversationId, userId]);

    console.log('✅ Messages marked as read');

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

/**
 * Get admin user ID for starting conversation
 */
exports.getAdminForChat = async (req, res) => {
  try {
    console.log('📱 Fetching admin user for chat');

    const [admins] = await pool.query(`
      SELECT u.id, u.name, u.email, u.user_type, up.user_image
      FROM users u
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE u.user_type = 'admin'
      LIMIT 1
    `);

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No admin user found'
      });
    }

    console.log('✅ Found admin user:', admins[0].id);

    res.status(200).json({
      success: true,
      admin: admins[0]
    });

  } catch (error) {
    console.error('❌ Error fetching admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin',
      error: error.message
    });
  }
};

/**
 * Get all users who have chatted with admin (for admin panel)
 */
exports.getAdminChatUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user is admin
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    console.log('📱 Fetching chat users for admin');

    const [users] = await pool.query(`
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.user_type,
        up.user_image,
        c.last_message,
        c.last_message_time,
        c.unread_count,
        c.id as conversation_id
      FROM conversations c
      JOIN users u ON c.other_user_id = u.id
      LEFT JOIN user_profile up ON u.id = up.user_id
      WHERE c.user_id = ? AND c.is_admin_conversation = 1
      ORDER BY c.last_message_time DESC
    `, [userId]);

    console.log(`✅ Found ${users.length} chat users`);

    res.status(200).json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('❌ Error fetching admin chat users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat users',
      error: error.message
    });
  }
};

/**
 * Delete a conversation
 */
exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    console.log(`📱 Deleting conversation ${conversationId}`);

    // Verify user owns this conversation
    const [conversations] = await pool.query(`
      SELECT * FROM conversations WHERE id = ? AND user_id = ?
    `, [conversationId, userId]);

    if (conversations.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Delete the conversation (messages will be cascade deleted)
    await pool.query('DELETE FROM conversations WHERE id = ?', [conversationId]);

    console.log('✅ Conversation deleted');

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
};
