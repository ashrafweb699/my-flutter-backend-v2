const { pool } = require('./config/db');
const createShopkeeperTables = require('./db/migrations/create_shopkeeper_tables');
const updateUserProfileTable = require('./db/migrations/update_user_profile_table');
const removeProfileImageColumn = require('./db/migrations/remove_profile_image_column');
const updateOrdersTableForTracking = require('./db/migrations/update_orders_table_for_tracking');

async function migrate() {
  try {
    console.log('Starting database migration...');

    // Create or recreate drivers table with proper structure
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email_address VARCHAR(255),
        user_password VARCHAR(255),
        profile_img VARCHAR(255),
        cnic_front VARCHAR(255),
        cnic_back VARCHAR(255),
        vehicle_number VARCHAR(50),
        license_number VARCHAR(50),
        license_image VARCHAR(255),
        expiry_date DATE,
        current_latitude DECIMAL(10, 6) DEFAULT 25.139144,
        current_longitude DECIMAL(10, 6) DEFAULT 62.321495,
        rating DECIMAL(3, 1) DEFAULT 5.0,
        approval ENUM('pending', 'YES', 'NO') DEFAULT 'pending',
        online_status ENUM('online', 'offline') DEFAULT 'offline',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Drivers table created or already exists');
    
    // Run shopkeeper migration
    await createShopkeeperTables();
    
    // Update user_profile table with missing columns
    await updateUserProfileTable();
    
    // Remove duplicate profile_image column
    await removeProfileImageColumn();
    
    // Update orders table for tracking
    await updateOrdersTableForTracking();
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();