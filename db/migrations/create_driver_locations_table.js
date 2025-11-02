const { pool } = require('../../config/db');

async function createDriverLocationsTable() {
  try {
    console.log('Creating driver_locations table if not exists...');
    
    // First check if driver_locations table already exists
    const [checkRows] = await pool.query(`
      SELECT COUNT(*) as tableExists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'driver_locations'
    `);
    
    if (checkRows[0].tableExists > 0) {
      console.log('Driver locations table already exists, skipping creation');
      return;
    }
    
    // If driver_locations doesn't exist, create it with reference to drivers table (not driver_reg)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        heading FLOAT DEFAULT 0,
        accuracy FLOAT DEFAULT 0,
        speed FLOAT DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_driver_location (driver_id, timestamp),
        CONSTRAINT fk_driver_locations_driver
          FOREIGN KEY (driver_id) 
          REFERENCES drivers(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if last_location_update column exists in drivers table
    await pool.query(`
      SHOW COLUMNS FROM drivers LIKE 'last_location_update'
    `).then(async ([result]) => {
      if (result.length === 0) {
        await pool.query(`
          ALTER TABLE drivers
          ADD COLUMN last_location_update DATETIME NULL
        `);
        console.log('Added last_location_update column to drivers table');
      }
    });

    console.log('Driver locations table created or already exists');
  } catch (error) {
    console.error('Error creating driver_locations table:', error);
  }
}

module.exports = createDriverLocationsTable; 