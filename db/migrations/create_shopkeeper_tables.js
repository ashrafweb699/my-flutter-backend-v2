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
    console.log('Shopkeeper table created or already exists');

    // Helper function to add column if missing
    const addColumnIfMissing = async (colName, colDef) => {
      const [rows] = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'shopkeeper' AND column_name = ?
      `, [colName]);
      if (rows[0].cnt === 0) {
        await pool.query(`ALTER TABLE shopkeeper ADD COLUMN ${colName} ${colDef}`);
        console.log(`Added column shopkeeper.${colName}`);
      }
    };

    // Add CNIC image columns
    await addColumnIfMissing('cnic_front_image', 'VARCHAR(255) NULL');
    await addColumnIfMissing('cnic_back_image', 'VARCHAR(255) NULL');
    
    // Add updated_at column
    await addColumnIfMissing('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

    // Add email column if missing
    await addColumnIfMissing('email', 'VARCHAR(120) NULL');

    // Add address column if missing
    await addColumnIfMissing('address', 'TEXT NULL');

    console.log('Shopkeeper table migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error creating shopkeeper tables:', error);
    return false;
  }
}

module.exports = createShopkeeperTables;
