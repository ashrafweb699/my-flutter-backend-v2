/**
 * Database Migration Runner
 * Usage: node db/run-migration.js [migration-file-name]
 * Example: node db/run-migration.js 007_add_appointment_fields_to_service_items.sql
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gwadar_online_bazaar',
  multipleStatements: true
};

async function runMigration(migrationFile) {
  let connection;
  
  try {
    console.log('🔄 Starting migration...');
    console.log(`📁 File: ${migrationFile}`);
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const sql = await fs.readFile(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');
    
    // Execute migration
    const [results] = await connection.query(sql);
    console.log('✅ Migration executed successfully');
    
    // Show results
    if (Array.isArray(results)) {
      results.forEach((result, index) => {
        if (result.message) {
          console.log(`📝 ${result.message}`);
        }
      });
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error.message);
    console.error('\n💡 Tip: Check if the database exists and you have proper permissions');
    process.exit(1);
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Error: Please provide migration file name');
  console.log('\n📖 Usage:');
  console.log('  node db/run-migration.js [migration-file-name]');
  console.log('\n📝 Example:');
  console.log('  node db/run-migration.js 007_add_appointment_fields_to_service_items.sql');
  console.log('\n📂 Available migrations:');
  console.log('  - 007_add_appointment_fields_to_service_items.sql');
  console.log('  - 007_rollback_appointment_fields.sql (rollback)');
  process.exit(1);
}

// Run migration
runMigration(migrationFile);
