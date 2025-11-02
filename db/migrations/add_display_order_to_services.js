const { pool } = require('../../config/db');

async function addDisplayOrderToServices() {
  try {
    console.log('Adding display_order column to services table...');
    
    // Add display_order column if it doesn't exist
    await pool.query(`
      ALTER TABLE services 
      ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0
    `);
    
    // Set initial display_order based on current order
    await pool.query(`
      UPDATE services 
      SET display_order = id 
      WHERE display_order = 0 OR display_order IS NULL
    `);
    
    console.log('✅ display_order column added successfully');
    
  } catch (error) {
    console.error('Error adding display_order column:', error);
    throw error;
  }
}

module.exports = addDisplayOrderToServices;

// Run if called directly
if (require.main === module) {
  addDisplayOrderToServices()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
