const { pool } = require('../../config/db');

async function up() {
  const connection = await pool.getConnection();
  try {
    console.log('📦 Creating order_statistics table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        action_type ENUM('accepted', 'rejected', 'delivered', 'cancelled') NOT NULL,
        performed_by_user_id INT NOT NULL,
        performed_by_user_type ENUM('admin', 'd_boy', 'user') NOT NULL,
        performed_by_name VARCHAR(255),
        order_total_amount DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_order_id (order_id),
        INDEX idx_user_id (performed_by_user_id),
        INDEX idx_user_type (performed_by_user_type),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at),
        
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ order_statistics table created');
    
    // Create summary view for quick stats
    console.log('📦 Creating order_statistics_summary view...');
    
    await connection.query(`
      CREATE OR REPLACE VIEW order_statistics_summary AS
      SELECT 
        performed_by_user_id,
        performed_by_user_type,
        performed_by_name,
        COUNT(CASE WHEN action_type = 'delivered' THEN 1 END) as total_deliveries,
        COUNT(CASE WHEN action_type = 'accepted' THEN 1 END) as total_accepted,
        COUNT(CASE WHEN action_type = 'rejected' THEN 1 END) as total_rejected,
        COUNT(CASE WHEN action_type = 'cancelled' THEN 1 END) as total_cancelled,
        SUM(CASE WHEN action_type = 'delivered' THEN order_total_amount ELSE 0 END) as total_earnings,
        MIN(created_at) as first_action_date,
        MAX(created_at) as last_action_date
      FROM order_statistics
      GROUP BY performed_by_user_id, performed_by_user_type, performed_by_name
    `);
    
    console.log('✅ order_statistics_summary view created');
    
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
    console.log('📦 Dropping order_statistics view and table...');
    await connection.query('DROP VIEW IF EXISTS order_statistics_summary');
    await connection.query('DROP TABLE IF EXISTS order_statistics');
    console.log('✅ order_statistics dropped');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { up, down };
