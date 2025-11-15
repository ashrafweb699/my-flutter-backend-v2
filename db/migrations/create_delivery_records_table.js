const { pool } = require('../../config/db');

async function up() {
  const connection = await pool.getConnection();
  try {
    console.log('📦 Creating delivery_records table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS delivery_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        delivery_boy_id INT NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(20),
        delivery_address TEXT,
        order_amount DECIMAL(10, 2) DEFAULT 0,
        delivery_fee DECIMAL(10, 2) DEFAULT 0,
        delivery_earnings DECIMAL(10, 2) DEFAULT 0,
        delivery_date DATE NOT NULL,
        delivery_time TIME,
        status ENUM('completed', 'cancelled', 'failed') DEFAULT 'completed',
        notes TEXT,
        rating INT DEFAULT NULL,
        review TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_order_id (order_id),
        INDEX idx_delivery_boy_id (delivery_boy_id),
        INDEX idx_delivery_date (delivery_date),
        INDEX idx_status (status),
        
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (delivery_boy_id) REFERENCES delivery_boys(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ delivery_records table created');
    
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
    console.log('📦 Dropping delivery_records table...');
    await connection.query('DROP TABLE IF EXISTS delivery_records');
    console.log('✅ delivery_records table dropped');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { up, down };
