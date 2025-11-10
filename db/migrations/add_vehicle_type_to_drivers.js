const pool = require('../pool');

/**
 * Migration: Add vehicle_type column to drivers table
 * This column stores the type of vehicle (e.g., 'Car', 'Bike', 'Rickshaw')
 */
async function up() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Adding vehicle_type column to drivers table...');
    
    // Add vehicle_type column
    await connection.query(`
      ALTER TABLE drivers 
      ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50) DEFAULT 'Car' AFTER vehicle_number
    `);
    
    console.log('✅ vehicle_type column added successfully');
    
  } catch (error) {
    console.error('❌ Error adding vehicle_type column:', error);
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
    console.log('🔧 Removing vehicle_type column from drivers table...');
    
    await connection.query(`
      ALTER TABLE drivers 
      DROP COLUMN IF EXISTS vehicle_type
    `);
    
    console.log('✅ vehicle_type column removed successfully');
    
  } catch (error) {
    console.error('❌ Error removing vehicle_type column:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { up, down };
