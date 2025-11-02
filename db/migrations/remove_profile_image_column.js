const { pool } = require('../../config/db');

async function removeProfileImageColumn() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Check if profile_image column exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'user_profile' 
       AND COLUMN_NAME = 'profile_image'`
    );
    
    if (columns.length > 0) {
      // Drop profile_image column (we only need user_image)
      await connection.query('ALTER TABLE user_profile DROP COLUMN profile_image');
      console.log('✅ profile_image column removed from user_profile table');
    } else {
      console.log('ℹ️  profile_image column does not exist');
    }
    
    connection.release();
    console.log('✅ profile_image column removal completed');
    return true;
  } catch (error) {
    if (connection) connection.release();
    console.error('❌ Error removing profile_image column:', error);
    throw error;
  }
}

module.exports = removeProfileImageColumn;
