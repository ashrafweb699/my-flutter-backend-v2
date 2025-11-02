const { pool } = require('../config/db');

/**
 * Migration: Remove fcm_token column from drivers table
 * Reason: FCM tokens should only be stored in users table
 */
async function up() {
    try {
        console.log('🔧 Starting migration: Remove fcm_token from drivers table');
        
        // Check if column exists
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'drivers' 
            AND COLUMN_NAME = 'fcm_token'
        `);
        
        if (columns.length > 0) {
            // Remove fcm_token column from drivers table
            await pool.query('ALTER TABLE drivers DROP COLUMN fcm_token');
            console.log('✅ Successfully removed fcm_token column from drivers table');
        } else {
            console.log('ℹ️ fcm_token column does not exist in drivers table');
        }
        
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function down() {
    try {
        console.log('🔧 Rolling back migration: Add fcm_token back to drivers table');
        
        await pool.query(`
            ALTER TABLE drivers 
            ADD COLUMN fcm_token VARCHAR(250) NULL DEFAULT NULL
        `);
        
        console.log('✅ Rollback completed successfully');
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}

// Run migration if executed directly
if (require.main === module) {
    up()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { up, down };
