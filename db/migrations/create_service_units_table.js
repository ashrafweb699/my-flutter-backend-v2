const pool = require('../../config/db');

async function up() {
  const connection = await pool.getConnection();
  try {
    console.log('📦 Creating service_units table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_name VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ service_units table created');
    
    // Insert default units
    console.log('📦 Inserting default units...');
    
    const defaultUnits = [
      'KG', 'Piece', 'Plate', 'Bundle', 'Packet', 'Liter', 
      'Bottle', 'Can', 'Ticket', 'Room', 'Day', 'Hour', 
      'Ride', 'Service', 'Package', 'Box', 'Person'
    ];
    
    for (let i = 0; i < defaultUnits.length; i++) {
      await connection.query(
        `INSERT IGNORE INTO service_units (unit_name, display_order) VALUES (?, ?)`,
        [defaultUnits[i], i + 1]
      );
    }
    
    console.log(`✅ Inserted ${defaultUnits.length} default units`);
    
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
    console.log('📦 Dropping service_units table...');
    await connection.query('DROP TABLE IF EXISTS service_units');
    console.log('✅ service_units table dropped');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { up, down };
