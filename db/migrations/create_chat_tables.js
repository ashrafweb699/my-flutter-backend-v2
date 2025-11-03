const { pool } = require('../../config/db');

/**
 * Migration: Create Chat/Messaging Tables
 * Creates conversations and messages tables for WhatsApp-like messaging system
 */

async function createChatTables() {
  console.log('🔄 Creating chat tables for messaging system...');

  try {
    // 1. Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL COMMENT 'User who created/owns this conversation',
        other_user_id INT NOT NULL COMMENT 'The other user in the conversation',
        last_message TEXT NULL COMMENT 'Last message text',
        last_message_time DATETIME NULL COMMENT 'Time of last message',
        last_message_sender_id INT NULL COMMENT 'Who sent the last message',
        unread_count INT DEFAULT 0 COMMENT 'Number of unread messages for user_id',
        is_admin_conversation TINYINT(1) DEFAULT 0 COMMENT 'Is this conversation with admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (other_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (last_message_sender_id) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_conversation (user_id, other_user_id),
        INDEX idx_user_id (user_id),
        INDEX idx_other_user_id (other_user_id),
        INDEX idx_last_message_time (last_message_time),
        INDEX idx_is_admin (is_admin_conversation)
      )
    `);
    console.log('✅ Created conversations table');

    // 2. Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL COMMENT 'Reference to conversation',
        sender_id INT NOT NULL COMMENT 'User who sent the message',
        receiver_id INT NOT NULL COMMENT 'User who receives the message',
        message_text TEXT NULL COMMENT 'Text content of message',
        message_type ENUM('text', 'image', 'audio', 'video', 'document') DEFAULT 'text' COMMENT 'Type of message',
        media_url VARCHAR(500) NULL COMMENT 'URL for media messages',
        is_read TINYINT(1) DEFAULT 0 COMMENT 'Has message been read',
        read_at DATETIME NULL COMMENT 'When message was read',
        is_delivered TINYINT(1) DEFAULT 0 COMMENT 'Has message been delivered',
        delivered_at DATETIME NULL COMMENT 'When message was delivered',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_receiver_id (receiver_id),
        INDEX idx_created_at (created_at),
        INDEX idx_is_read (is_read)
      )
    `);
    console.log('✅ Created messages table');

    // 3. Create message attachments table for multiple attachments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        message_id INT NOT NULL,
        attachment_url VARCHAR(500) NOT NULL,
        attachment_type VARCHAR(50) NOT NULL,
        file_size INT NULL COMMENT 'File size in bytes',
        thumbnail_url VARCHAR(500) NULL COMMENT 'Thumbnail for images/videos',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        INDEX idx_message_id (message_id)
      )
    `);
    console.log('✅ Created message_attachments table');

    // 4. Create typing indicators table for real-time typing status
    await pool.query(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        id INT PRIMARY KEY AUTO_INCREMENT,
        conversation_id INT NOT NULL,
        user_id INT NOT NULL COMMENT 'User who is typing',
        is_typing TINYINT(1) DEFAULT 1,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_typing (conversation_id, user_id),
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_last_activity (last_activity)
      )
    `);
    console.log('✅ Created typing_indicators table');

    console.log('✅ Chat tables created successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Error creating chat tables:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back chat tables...');

  try {
    // Drop tables in reverse order
    await pool.query('DROP TABLE IF EXISTS typing_indicators');
    await pool.query('DROP TABLE IF EXISTS message_attachments');
    await pool.query('DROP TABLE IF EXISTS messages');
    await pool.query('DROP TABLE IF EXISTS conversations');

    console.log('✅ Chat tables rollback completed');
    return { success: true };

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  createChatTables()
    .then(() => {
      console.log('Migration executed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createChatTables;
module.exports.down = down;
