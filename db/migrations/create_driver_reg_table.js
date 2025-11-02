const { pool } = require('../../config/db');

async function createDriverRegTable() {
  try {
    // Skip creating driver_reg table since we're using drivers table instead
    console.log('Skip creating driver_reg table - using drivers table instead...');
    
    // Check if drivers table exists
    const [checkRows] = await pool.query(`
      SELECT COUNT(*) as tableExists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'drivers'
    `);
    
    if (checkRows[0].tableExists > 0) {
      console.log('Drivers table already exists, skipping creation');
      return;
    }
    
    // If for some reason the drivers table doesn't exist, we could create it here
    // but that's unlikely since we've already verified it exists
    
    console.log('Driver registration table check completed');
  } catch (error) {
    console.error('Error creating driver_reg table:', error);
  }
}

module.exports = createDriverRegTable; 