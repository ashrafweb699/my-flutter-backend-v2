const { pool } = require('../../config/db');

/**
 * Migration: Add message edit columns
 * Adds is_edited and edited_at columns to messages table
 */

async function addMessageEditColumns() {
  console.log('🔄 Adding message edit columns...');

  try {
    // Check if columns already exist
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME IN ('is_edited', 'edited_at')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    // Add is_edited column if it doesn't exist
    if (!existingColumns.includes('is_edited')) {
      await pool.query(`
        ALTER TABLE messages 
        ADD COLUMN is_edited TINYINT(1) DEFAULT 0 COMMENT 'Has message been edited' 
        AFTER is_delivered
      `);
      console.log('✅ Added is_edited column');
    } else {
      console.log('ℹ️ is_edited column already exists');
    }

    // Add edited_at column if it doesn't exist
    if (!existingColumns.includes('edited_at')) {
      await pool.query(`
        ALTER TABLE messages 
        ADD COLUMN edited_at DATETIME NULL COMMENT 'When message was edited' 
        AFTER is_edited
      `);
      console.log('✅ Added edited_at column');
    } else {
      console.log('ℹ️ edited_at column already exists');
    }

    console.log('✅ Message edit columns migration completed');
    return { success: true };

  } catch (error) {
    console.error('❌ Error adding message edit columns:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Rolling back message edit columns...');

  try {
    await pool.query('ALTER TABLE messages DROP COLUMN IF EXISTS edited_at');
    await pool.query('ALTER TABLE messages DROP COLUMN IF EXISTS is_edited');

    console.log('✅ Message edit columns rollback completed');
    return { success: true };

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  addMessageEditColumns()
    .then(() => {
      console.log('Migration executed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addMessageEditColumns;
module.exports.down = down;
