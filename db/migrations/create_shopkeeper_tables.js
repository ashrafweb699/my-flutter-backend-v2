const { pool } = require('../../config/db');

async function createShopkeeperTables() {
  try {
    // Create shopkeeper table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopkeeper (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE,
        shop_name VARCHAR(255) NOT NULL,
        shop_image VARCHAR(255) NULL,
        category VARCHAR(255) NULL,
        mobile_number VARCHAR(20) NULL,
        approval_status ENUM('pending','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Shopkeepers table created or already exists');
    console.log('Shopkeepers table migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error creating shopkeeper tables:', error);
    return false;
  }
}

module.exports = createShopkeeperTables;
