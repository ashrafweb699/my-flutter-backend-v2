const db = require('../../config/db');

/**
 * Creates the cab_driver_offers table to store multiple driver offers per booking
 */
async function createCabDriverOffersTable() {
  const pool = db.pool;
  
  try {
    // Check if table exists
    const [rows] = await pool.execute(
      "SHOW TABLES LIKE 'cab_driver_offers'"
    );
    
    if (rows.length > 0) {
      console.log('cab_driver_offers table already exists');
      return;
    }
    
    // Create table query
    const createTableQuery = `
      CREATE TABLE cab_driver_offers (
        id INT NOT NULL AUTO_INCREMENT,
        booking_id INT NOT NULL COMMENT 'Reference to cab_bookings.id',
        driver_id VARCHAR(100) NOT NULL,
        driver_name VARCHAR(100),
        driver_phone VARCHAR(20),
        vehicle_type VARCHAR(50),
        vehicle_number VARCHAR(20),
        proposed_fare DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
        offered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP NULL,
        PRIMARY KEY (id),
        UNIQUE KEY unique_booking_driver (booking_id, driver_id),
        INDEX idx_booking_id (booking_id),
        INDEX idx_driver_id (driver_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    // Execute query
    await pool.execute(createTableQuery);
    
    console.log('✅ cab_driver_offers table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating cab_driver_offers table:', error.message);
    throw error;
  }
}

module.exports = createCabDriverOffersTable;
