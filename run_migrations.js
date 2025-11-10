require('dotenv').config();
const path = require('path');

/**
 * Migration Runner Script
 * Run specific migrations to update database schema
 */

async function runMigrations() {
  try {
    console.log('🚀 Starting migrations...\n');
    
    // Migration 1: Add vehicle_type column
    console.log('📋 Migration 1: Add vehicle_type to drivers table');
    const vehicleTypeMigration = require('./db/migrations/add_vehicle_type_to_drivers');
    await vehicleTypeMigration.up();
    console.log('✅ Migration 1 completed\n');
    
    // Migration 2: Create driver_statistics table
    console.log('📋 Migration 2: Create driver_statistics table');
    const statisticsMigration = require('./db/migrations/create_driver_statistics_table');
    await statisticsMigration.up();
    console.log('✅ Migration 2 completed\n');
    
    console.log('🎉 All migrations completed successfully!');
    
    // Close database connection
    const { pool } = require('./config/db');
    await pool.end();
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
