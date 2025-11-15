const { pool } = require('../../config/db');

async function addDeliveryUserTracking() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('🚚 Adding delivery user tracking columns to orders table...');
    
    // Add delivered_by_user_id column (stores user ID - could be admin or delivery boy)
    const [deliveredByCol] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'orders' 
       AND COLUMN_NAME = 'delivered_by_user_id'`
    );
    
    if (deliveredByCol.length === 0) {
      await connection.query(`
        ALTER TABLE orders 
        ADD COLUMN delivered_by_user_id INT AFTER driver_id,
        ADD COLUMN delivered_by_user_type ENUM('admin', 'delivery_boy') AFTER delivered_by_user_id
      `);
      console.log('✅ delivered_by_user_id and delivered_by_user_type columns added to orders table');
    } else {
      console.log('ℹ️ Delivery user tracking columns already exist');
    }
    
    connection.release();
    console.log('✅ Delivery user tracking migration completed');
    return true;
  } catch (error) {
    if (connection) connection.release();
    console.error('❌ Error adding delivery user tracking:', error);
    throw error;
  }
}

module.exports = addDeliveryUserTracking;
