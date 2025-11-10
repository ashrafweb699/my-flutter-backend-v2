const { pool } = require('../../config/db');

/**
 * Migration: Create driver_statistics table
 * This table tracks driver performance metrics
 */
async function up() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Creating driver_statistics table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS driver_statistics (
        id INT PRIMARY KEY AUTO_INCREMENT,
        driver_id INT NOT NULL,
        total_bookings INT DEFAULT 0,
        completed_bookings INT DEFAULT 0,
        cancelled_bookings INT DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0.00,
        total_distance DECIMAL(10, 2) DEFAULT 0.00,
        average_rating DECIMAL(3, 2) DEFAULT 0.00,
        total_ratings INT DEFAULT 0,
        last_booking_date DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
        INDEX idx_driver_id (driver_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ driver_statistics table created successfully');
    
    // Initialize statistics for existing drivers
    console.log('🔧 Initializing statistics for existing drivers...');
    
    await connection.query(`
      INSERT INTO driver_statistics (driver_id, total_bookings, completed_bookings, cancelled_bookings, total_earnings)
      SELECT 
        d.id as driver_id,
        COUNT(cb.id) as total_bookings,
        SUM(CASE WHEN cb.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN cb.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        COALESCE(SUM(CASE WHEN cb.status = 'completed' THEN cb.proposed_fare ELSE 0 END), 0) as total_earnings
      FROM drivers d
      LEFT JOIN cab_bookings cb ON d.id = cb.driver_id
      GROUP BY d.id
      ON DUPLICATE KEY UPDATE
        total_bookings = VALUES(total_bookings),
        completed_bookings = VALUES(completed_bookings),
        cancelled_bookings = VALUES(cancelled_bookings),
        total_earnings = VALUES(total_earnings)
    `);
    
    console.log('✅ Statistics initialized for existing drivers');
    
  } catch (error) {
    console.error('❌ Error creating driver_statistics table:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Rollback migration
 */
async function down() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Dropping driver_statistics table...');
    
    await connection.query(`
      DROP TABLE IF EXISTS driver_statistics
    `);
    
    console.log('✅ driver_statistics table dropped successfully');
    
  } catch (error) {
    console.error('❌ Error dropping driver_statistics table:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { up, down };
