const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Add your MySQL password here
  database: 'gwadar_online_bazaar',
  multipleStatements: true
};

async function runMigrations() {
  let connection;
  
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Connected to database successfully!');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'create_order_tracking_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migrations...');
    
    // Execute the migration
    await connection.execute(migrationSQL);
    
    console.log('✅ All migrations completed successfully!');
    
    // Verify tables were created
    console.log('\nVerifying created tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    const expectedTables = [
      'order_tracking',
      'user_notifications', 
      'order_status_history',
      'driver_locations',
      'order_items'
    ];
    
    expectedTables.forEach(tableName => {
      if (tableNames.includes(tableName)) {
        console.log(`✅ Table '${tableName}' created successfully`);
      } else {
        console.log(`❌ Table '${tableName}' was not created`);
      }
    });
    
    // Check if orders table was updated
    const [columns] = await connection.execute('DESCRIBE orders');
    const columnNames = columns.map(col => col.Field);
    
    const expectedColumns = [
      'delivery_address',
      'customer_phone', 
      'customer_name',
      'delivery_notes',
      'estimated_delivery_time',
      'actual_delivery_time',
      'driver_id',
      'payment_method',
      'payment_status'
    ];
    
    console.log('\nVerifying orders table updates...');
    expectedColumns.forEach(columnName => {
      if (columnNames.includes(columnName)) {
        console.log(`✅ Column '${columnName}' added to orders table`);
      } else {
        console.log(`❌ Column '${columnName}' was not added to orders table`);
      }
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run the migrations
runMigrations();
