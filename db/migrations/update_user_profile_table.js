const { pool } = require('../../config/db');

async function updateUserProfileTable() {
  try {
    console.log('Updating user_profile table with missing columns...');
    
    const connection = await pool.getConnection();
    
    // Check and add city column if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE user_profile 
        ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER address
      `);
      console.log('✅ city column added or already exists');
    } catch (error) {
      if (!error.message.includes('Duplicate column')) {
        console.log('⚠️ city column might already exist:', error.message);
      }
    }
    
    // Check and add state column if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE user_profile 
        ADD COLUMN IF NOT EXISTS state VARCHAR(100) AFTER city
      `);
      console.log('✅ state column added or already exists');
    } catch (error) {
      if (!error.message.includes('Duplicate column')) {
        console.log('⚠️ state column might already exist:', error.message);
      }
    }
    
    // Check and add postal_code column if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE user_profile 
        ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) AFTER state
      `);
      console.log('✅ postal_code column added or already exists');
    } catch (error) {
      if (!error.message.includes('Duplicate column')) {
        console.log('⚠️ postal_code column might already exist:', error.message);
      }
    }
    
    // Check and add country column if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE user_profile 
        ADD COLUMN IF NOT EXISTS country VARCHAR(100) AFTER postal_code
      `);
      console.log('✅ country column added or already exists');
    } catch (error) {
      if (!error.message.includes('Duplicate column')) {
        console.log('⚠️ country column might already exist:', error.message);
      }
    }
    
    // Check and add profile_image column if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE user_profile 
        ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) AFTER country
      `);
      console.log('✅ profile_image column added or already exists');
    } catch (error) {
      if (!error.message.includes('Duplicate column')) {
        console.log('⚠️ profile_image column might already exist:', error.message);
      }
    }
    
    connection.release();
    console.log('✅ user_profile table updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating user_profile table:', error);
    throw error;
  }
}

module.exports = updateUserProfileTable;
