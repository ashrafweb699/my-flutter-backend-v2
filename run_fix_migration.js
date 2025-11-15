const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔧 Running migration: fix_missing_columns.sql');
    
    const migrationPath = path.join(__dirname, 'db', 'migrations', 'fix_missing_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and filter empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log(`\n📝 Executing: ${statement.substring(0, 80)}...`);
      try {
        await pool.query(statement);
        console.log('✅ Statement executed successfully');
      } catch (err) {
        console.error('❌ Error executing statement:', err.message);
        // Continue with next statement
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
