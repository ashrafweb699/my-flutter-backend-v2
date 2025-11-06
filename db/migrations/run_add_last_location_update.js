const { pool } = require('../../config/db');

async function addLastLocationUpdateColumn() {
  try {
    console.log('🔍 Checking if last_location_update column exists in drivers table...');
    
    // Check if column exists
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM drivers LIKE 'last_location_update'
    `);
    
    if (columns.length === 0) {
      console.log('❌ Column does not exist. Adding it now...');
      
      // Add the column
      await pool.query(`
        ALTER TABLE drivers
        ADD COLUMN last_location_update DATETIME NULL DEFAULT CURRENT_TIMESTAMP
      `);
      
      console.log('✅ Successfully added last_location_update column to drivers table');
      
      // Update existing records
      const [result] = await pool.query(`
        UPDATE drivers 
        SET last_location_update = CURRENT_TIMESTAMP 
        WHERE last_location_update IS NULL
      `);
      
      console.log(`✅ Updated ${result.affectedRows} existing driver records`);
    } else {
      console.log('✅ Column already exists. No action needed.');
    }
    
    // Verify the column
    const [describe] = await pool.query('DESCRIBE drivers');
    const locationColumn = describe.find(col => col.Field === 'last_location_update');
    
    if (locationColumn) {
      console.log('✅ Verification successful:');
      console.log('   Field:', locationColumn.Field);
      console.log('   Type:', locationColumn.Type);
      console.log('   Null:', locationColumn.Null);
      console.log('   Default:', locationColumn.Default);
    }
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addLastLocationUpdateColumn();
