const db = require('../../config/db');

/**
 * Creates the cab_bookings table in the database
 */
async function createCabBookingsTable() {
  const pool = db.pool;
  
  try {
    // Check if table exists
    const [rows] = await pool.execute(
      "SHOW TABLES LIKE 'cab_bookings'"
    );
    
    if (rows.length > 0) {
      console.log('cab_bookings table already exists');
      return;
    }
    
    // Create table query
    const createTableQuery = `
      CREATE TABLE cab_bookings (
        id INT NOT NULL AUTO_INCREMENT,
        booking_id VARCHAR(50) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        user_phone VARCHAR(20),
        pickup_latitude DECIMAL(10, 8) NOT NULL,
        pickup_longitude DECIMAL(11, 8) NOT NULL,
        pickup_address TEXT NOT NULL,
        destination_latitude DECIMAL(10, 8) NOT NULL,
        destination_longitude DECIMAL(11, 8) NOT NULL,
        destination_address TEXT NOT NULL,
        passenger_count INT DEFAULT 1,
        driver_id VARCHAR(100),
        driver_name VARCHAR(100),
        driver_phone VARCHAR(20),
        vehicle_type VARCHAR(50),
        vehicle_number VARCHAR(20),
        proposed_fare DECIMAL(10, 2),
        status ENUM('requested', 'proposed', 'accepted', 'rejected', 'completed') NOT NULL DEFAULT 'requested',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY (booking_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    // Execute query
    await pool.execute(createTableQuery);
    
    console.log('cab_bookings table created successfully');
    
  } catch (error) {
    console.error('Error creating cab_bookings table:', error.message);
    throw error;
  }
}

module.exports = createCabBookingsTable; 