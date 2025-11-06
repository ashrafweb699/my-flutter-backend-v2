const { up } = require('./db/migrations/add_tracking_start_time');

async function runMigration() {
  try {
    console.log('🚀 Running tracking migration...');
    await up();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
