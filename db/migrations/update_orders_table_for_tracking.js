const { pool } = require('../../config/db');

async function updateOrdersTableForTracking() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Add order_type column (service or product)
    const [orderTypeCol] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'orders' 
       AND COLUMN_NAME = 'order_type'`
    );
    
    if (orderTypeCol.length === 0) {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN order_type ENUM('service', 'product') DEFAULT 'product' AFTER status
      `);
      console.log('✅ order_type column added to orders table');
    }
    
    // Add estimated_delivery_time column
    const [deliveryTimeCol] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'orders' 
       AND COLUMN_NAME = 'estimated_delivery_time'`
    );
    
    if (deliveryTimeCol.length === 0) {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN estimated_delivery_time VARCHAR(50) AFTER order_type
      `);
      console.log('✅ estimated_delivery_time column added to orders table');
    }
    
    // Add confirmed_by column (admin or delivery_boy user_id)
    const [confirmedByCol] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'orders' 
       AND COLUMN_NAME = 'confirmed_by'`
    );
    
    if (confirmedByCol.length === 0) {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN confirmed_by INT AFTER estimated_delivery_time,
        ADD COLUMN confirmed_at TIMESTAMP NULL AFTER confirmed_by
      `);
      console.log('✅ confirmed_by and confirmed_at columns added to orders table');
    }
    
    // Update order_tracking table to include order_type
    const [trackingTypeCol] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'order_tracking' 
       AND COLUMN_NAME = 'order_type'`
    );
    
    if (trackingTypeCol.length === 0) {
      await connection.query(`
        ALTER TABLE order_tracking 
        ADD COLUMN order_type ENUM('service', 'product') DEFAULT 'product' AFTER status
      `);
      console.log('✅ order_type column added to order_tracking table');
    }
    
    connection.release();
    console.log('✅ Orders table updated for tracking successfully');
    return true;
  } catch (error) {
    if (connection) connection.release();
    console.error('❌ Error updating orders table for tracking:', error);
    throw error;
  }
}

module.exports = updateOrdersTableForTracking;
