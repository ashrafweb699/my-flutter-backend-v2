const { pool } = require('../../config/db');

async function up() {
  const connection = await pool.getConnection();
  try {
    console.log('📦 Creating service_units table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS service_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_name VARCHAR(50) NOT NULL UNIQUE,
        unit_symbol VARCHAR(10) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_unit_name (unit_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ service_units table created');
    
    // Insert default units with symbols
    console.log('📦 Inserting default units...');
    
    const defaultUnits = [
      { name: 'Kilogram', symbol: 'KG' },
      { name: 'Piece', symbol: 'Pcs' },
      { name: 'Liter', symbol: 'L' },
      { name: 'Meter', symbol: 'M' },
      { name: 'Box', symbol: 'Box' },
      { name: 'Dozen', symbol: 'Dzn' },
      { name: 'Pack', symbol: 'Pack' },
      { name: 'Hour', symbol: 'Hr' },
      { name: 'Day', symbol: 'Day' },
      { name: 'Month', symbol: 'Month' }
    ];
    
    for (const unit of defaultUnits) {
      await connection.query(
        `INSERT IGNORE INTO service_units (unit_name, unit_symbol) VALUES (?, ?)`,
        [unit.name, unit.symbol]
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
