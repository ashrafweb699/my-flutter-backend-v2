const { pool } = require('../../config/db');

module.exports = async function createDeliveryBoysTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS delivery_boys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE,
        full_name VARCHAR(100),
        email VARCHAR(100),
        mobile_number VARCHAR(20),
        cnic_front_image VARCHAR(255),
        cnic_back_image VARCHAR(255),
        approval_status ENUM('pending','approved','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Conditionally add additional columns to align with drivers table (excluding vehicle/license fields)
    const addColumnIfMissing = async (colName, colDef) => {
      const [rows] = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'delivery_boys' AND column_name = ?
      `, [colName]);
      if (rows[0].cnt === 0) {
        await pool.query(`ALTER TABLE delivery_boys ADD COLUMN ${colName} ${colDef}`);
        console.log(`Added column delivery_boys.${colName}`);
      }
    };

    await addColumnIfMissing('profile_image', 'VARCHAR(255) NULL');
    await addColumnIfMissing('rating', "DECIMAL(3,1) NOT NULL DEFAULT 5.0");
    await addColumnIfMissing('online_status', "ENUM('online','offline') NOT NULL DEFAULT 'offline'");
    await addColumnIfMissing('current_latitude', 'DECIMAL(10,8) DEFAULT 0');
    await addColumnIfMissing('current_longitude', 'DECIMAL(11,8) DEFAULT 0');
    await addColumnIfMissing('last_location_update', 'TIMESTAMP NULL DEFAULT NULL');

    console.log('Delivery boys table check/creation completed');
  } catch (error) {
    console.error('Error creating delivery boys table:', error);
  }
}


