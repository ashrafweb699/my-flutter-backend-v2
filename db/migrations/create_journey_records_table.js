const { pool } = require('../../config/db');

async function up() {
  const connection = await pool.getConnection();
  try {
    console.log('📦 Creating journey_records table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS journey_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schedule_id INT NOT NULL,
        bus_manager_id INT NOT NULL,
        bus_number VARCHAR(50) NOT NULL,
        route_from VARCHAR(100) NOT NULL,
        route_to VARCHAR(100) NOT NULL,
        journey_date DATE NOT NULL,
        timing VARCHAR(20),
        total_seats INT DEFAULT 45,
        booked_seats INT DEFAULT 0,
        available_seats INT DEFAULT 45,
        total_revenue DECIMAL(10, 2) DEFAULT 0,
        per_seat_rate DECIMAL(10, 2) DEFAULT 0,
        status ENUM('completed', 'cancelled', 'in_progress') DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_schedule_id (schedule_id),
        INDEX idx_bus_manager_id (bus_manager_id),
        INDEX idx_journey_date (journey_date),
        INDEX idx_status (status),
        
        FOREIGN KEY (schedule_id) REFERENCES bus_schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (bus_manager_id) REFERENCES bus_managers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ journey_records table created');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function down() {
  const connection = await pool.getConnection();
  try {
    console.log('📦 Dropping journey_records table...');
    await connection.query('DROP TABLE IF EXISTS journey_records');
    console.log('✅ journey_records table dropped');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { up, down };
