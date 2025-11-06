const { pool } = require('../../config/db');

async function up() {
  try {
    console.log('🔧 Adding tracking columns to order_tracking table...');
    
    // Check if tracking_start_time column exists
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'order_tracking' 
      AND COLUMN_NAME = 'tracking_start_time'
    `);
    
    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE order_tracking 
        ADD COLUMN tracking_start_time DATETIME NULL AFTER estimated_delivery_time
      `);
      console.log('✅ Added tracking_start_time column');
    } else {
      console.log('ℹ️ tracking_start_time column already exists');
    }
    
    // Add order_type column if not exists
    const [orderTypeColumns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'order_tracking' 
      AND COLUMN_NAME = 'order_type'
    `);
    
    if (orderTypeColumns.length === 0) {
      await pool.query(`
        ALTER TABLE order_tracking 
        ADD COLUMN order_type ENUM('service', 'product') DEFAULT 'product' AFTER status
      `);
      console.log('✅ Added order_type column');
    } else {
      console.log('ℹ️ order_type column already exists');
    }
    
    // Add accepted_by column if not exists (for admin/d_boy who accepted order)
    const [acceptedByColumns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'order_tracking' 
      AND COLUMN_NAME = 'accepted_by'
    `);
    
    if (acceptedByColumns.length === 0) {
      await pool.query(`
        ALTER TABLE order_tracking 
        ADD COLUMN accepted_by INT NULL AFTER driver_id,
        ADD INDEX idx_accepted_by (accepted_by)
      `);
      console.log('✅ Added accepted_by column for order accepter (admin/d_boy)');
    } else {
      console.log('ℹ️ accepted_by column already exists');
    }
    
    console.log('✅ Migration completed successfully');
    console.log('ℹ️ Note: driver_id is for cab booking, accepted_by is for order tracking');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔧 Removing tracking_start_time and order_type columns...');
    
    await pool.query(`
      ALTER TABLE order_tracking 
      DROP COLUMN IF EXISTS tracking_start_time,
      DROP COLUMN IF EXISTS order_type
    `);
    
    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
