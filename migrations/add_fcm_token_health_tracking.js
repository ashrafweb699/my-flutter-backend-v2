const { pool } = require('../config/db');

/**
 * Migration: Add FCM Token Health Tracking
 * Adds columns and tables for monitoring token validity
 */

async function up() {
  console.log('🔄 Running migration: add_fcm_token_health_tracking');

  try {
    // 1. Add validation timestamp columns to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS fcm_token_validated_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS fcm_token_invalidated_at DATETIME NULL,
      ADD COLUMN IF NOT EXISTS fcm_token_last_used_at DATETIME NULL
    `);
    console.log('✅ Added token tracking columns to users table');

    // 2. Create FCM token health logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fcm_token_health_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        total_tokens INT NOT NULL DEFAULT 0,
        valid_tokens INT NOT NULL DEFAULT 0,
        invalid_tokens INT NOT NULL DEFAULT 0,
        cleaned_tokens INT NOT NULL DEFAULT 0,
        check_date DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_check_date (check_date)
      )
    `);
    console.log('✅ Created fcm_token_health_logs table');

    // 3. Create notification delivery tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_delivery_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        fcm_token VARCHAR(255),
        notification_title VARCHAR(255),
        notification_body TEXT,
        delivery_status ENUM('sent', 'delivered', 'failed', 'opened') DEFAULT 'sent',
        error_reason VARCHAR(255),
        sent_at DATETIME NOT NULL,
        delivered_at DATETIME NULL,
        opened_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_delivery_status (delivery_status),
        INDEX idx_sent_at (sent_at)
      )
    `);
    console.log('✅ Created notification_delivery_logs table');

    // 4. Create notification engagement analytics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_analytics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date DATE NOT NULL UNIQUE,
        total_sent INT DEFAULT 0,
        total_delivered INT DEFAULT 0,
        total_failed INT DEFAULT 0,
        total_opened INT DEFAULT 0,
        delivery_rate DECIMAL(5, 2),
        open_rate DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_date (date)
      )
    `);
    console.log('✅ Created notification_analytics table');

    console.log('✅ Migration completed successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back migration: add_fcm_token_health_tracking');

  try {
    // Remove columns from users table
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS fcm_token_validated_at,
      DROP COLUMN IF EXISTS fcm_token_invalidated_at,
      DROP COLUMN IF EXISTS fcm_token_last_used_at
    `);

    // Drop tables
    await pool.query('DROP TABLE IF EXISTS notification_analytics');
    await pool.query('DROP TABLE IF EXISTS notification_delivery_logs');
    await pool.query('DROP TABLE IF EXISTS fcm_token_health_logs');

    console.log('✅ Rollback completed');
    return { success: true };

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration executed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
