const { pool } = require('../../config/db');

async function createUsersTable() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255),
        user_type ENUM('user', 'driver', 'shopkeeper', 'bus_manager') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created or already exists');

    // Create FCM tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('FCM tokens table created or already exists');

    return true;
  } catch (error) {
    console.error('Error creating auth tables:', error);
    return false;
  }
}

module.exports = createUsersTable;
