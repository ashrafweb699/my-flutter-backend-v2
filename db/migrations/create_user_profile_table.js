const { pool } = require('../../config/db');

async function createUserProfileTable() {
  try {
    console.log('Creating user_profile table if not exists...');
    
    const connection = await pool.getConnection();
    
    // Create the user_profile table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        mobile_number VARCHAR(20),
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        profile_image VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    connection.release();
    console.log('user_profile table created or already exists');
    return true;
  } catch (error) {
    console.error('Error creating user_profile table:', error);
    throw error;
  }
}

module.exports = createUserProfileTable;
