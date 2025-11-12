const { pool } = require('../../config/db');

module.exports = async function alterServiceItemsAddServiceId() {
  try {
    console.log('🔄 Altering service_items table to use service_id instead of service_name...');
    
    // Step 1: Check if service_id column exists
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM service_items LIKE 'service_id'
    `);
    
    if (columns.length === 0) {
      // Add service_id column if it doesn't exist
      await pool.query(`
        ALTER TABLE service_items 
        ADD COLUMN service_id INT NULL AFTER id
      `);
      console.log('✅ Added service_id column');
    } else {
      console.log('✅ service_id column already exists');
    }

    // Step 2: Migrate existing data - map service_name to service_id
    // Get all unique service names from service_items
    const [serviceItems] = await pool.query(`
      SELECT DISTINCT service_name FROM service_items WHERE service_name IS NOT NULL
    `);

    // For each service name, find the matching service_id and update
    for (const item of serviceItems) {
      const serviceName = item.service_name;
      
      // Find the service_id from services table
      const [services] = await pool.query(`
        SELECT id FROM services WHERE service_name = ? LIMIT 1
      `, [serviceName]);

      if (services.length > 0) {
        const serviceId = services[0].id;
        
        // Update service_items with the service_id
        await pool.query(`
          UPDATE service_items 
          SET service_id = ? 
          WHERE service_name = ? AND service_id IS NULL
        `, [serviceId, serviceName]);
        
        console.log(`✅ Migrated "${serviceName}" to service_id ${serviceId}`);
      } else {
        console.log(`⚠️  No matching service found for "${serviceName}"`);
      }
    }

    // Step 3: Check for any remaining NULL service_ids
    const [nullItems] = await pool.query(`
      SELECT COUNT(*) as count FROM service_items WHERE service_id IS NULL
    `);
    
    if (nullItems[0].count > 0) {
      console.log(`⚠️  Found ${nullItems[0].count} items with NULL service_id`);
      
      // Try to find a default service to assign
      const [defaultService] = await pool.query(`
        SELECT id FROM services ORDER BY id ASC LIMIT 1
      `);
      
      if (defaultService.length > 0) {
        const defaultServiceId = defaultService[0].id;
        await pool.query(`
          UPDATE service_items 
          SET service_id = ? 
          WHERE service_id IS NULL
        `, [defaultServiceId]);
        console.log(`✅ Assigned default service_id ${defaultServiceId} to NULL items`);
      } else {
        console.log('⚠️  No services found, keeping service_id nullable');
        return; // Don't make it NOT NULL if we can't assign values
      }
    }
    
    // Step 4: Make service_id NOT NULL after migration
    await pool.query(`
      ALTER TABLE service_items 
      MODIFY COLUMN service_id INT NOT NULL
    `);
    console.log('✅ Made service_id NOT NULL');

    // Step 4: Add foreign key constraint
    // First check if foreign key already exists
    const [fkCheck] = await pool.query(`
      SELECT CONSTRAINT_NAME 
      FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_items' 
      AND CONSTRAINT_NAME = 'fk_service_items_service_id'
    `);

    if (fkCheck.length === 0) {
      await pool.query(`
        ALTER TABLE service_items 
        ADD CONSTRAINT fk_service_items_service_id 
        FOREIGN KEY (service_id) REFERENCES services(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('✅ Added foreign key constraint');
    } else {
      console.log('✅ Foreign key constraint already exists');
    }

    // Step 5: Add index on service_id
    const [indexCheck] = await pool.query(`
      SHOW INDEX FROM service_items WHERE Key_name = 'idx_service_id'
    `);

    if (indexCheck.length === 0) {
      await pool.query(`
        ALTER TABLE service_items 
        ADD INDEX idx_service_id (service_id)
      `);
      console.log('✅ Added index on service_id');
    } else {
      console.log('✅ Index on service_id already exists');
    }

    // Step 6: Keep service_name for backward compatibility but make it nullable
    await pool.query(`
      ALTER TABLE service_items 
      MODIFY COLUMN service_name VARCHAR(100) NULL
    `);
    console.log('✅ Made service_name nullable for backward compatibility');

    console.log('✅ service_items table migration completed successfully!');
    console.log('📝 Note: service_name column kept for backward compatibility');
    
  } catch (error) {
    console.error('❌ Error altering service_items table:', error);
    // Don't throw error to allow server to continue starting
    console.log('⚠️  Migration failed but server will continue...');
  }
};
