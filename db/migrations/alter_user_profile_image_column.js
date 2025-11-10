const { pool } = require('../../config/db');

async function alterUserProfileImageColumn() {
  try {
    console.log('🔧 Altering user_profile.profile_image column size...');
    
    const connection = await pool.getConnection();
    
    // Increase user_image column size to accommodate long Cloudinary URLs
    await connection.query(`
      ALTER TABLE user_profile 
      MODIFY COLUMN user_image VARCHAR(500)
    `);
    
    connection.release();
    console.log('✅ user_profile.profile_image column size increased to VARCHAR(500)');
    return true;
  } catch (error) {
    // Ignore error if column already has correct size
    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
      console.log('⚠️ Column already has correct size, skipping');
      return true;
    }
    console.error('❌ Error altering user_profile.profile_image column:', error);
    throw error;
  }
}

module.exports = alterUserProfileImageColumn;
