const { pool } = require('../../config/db');

async function cleanupOrphanDriverUsers() {
  try {
    console.log('🔍 Finding orphan driver users (users with type=driver but no driver record)...');
    
    // Find users with type='driver' but no corresponding entry in drivers table
    const [orphans] = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at
      FROM users u
      LEFT JOIN drivers d ON u.id = d.user_id
      WHERE u.user_type = 'driver' AND d.id IS NULL
    `);
    
    if (orphans.length === 0) {
      console.log('✅ No orphan driver users found. Database is clean!');
      process.exit(0);
      return;
    }
    
    console.log(`⚠️  Found ${orphans.length} orphan driver user(s):`);
    orphans.forEach(user => {
      console.log(`   - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Created: ${user.created_at}`);
    });
    
    // Delete orphan users
    const orphanIds = orphans.map(u => u.id);
    const [result] = await pool.query(`
      DELETE FROM users WHERE id IN (?)
    `, [orphanIds]);
    
    console.log(`✅ Deleted ${result.affectedRows} orphan driver user(s)`);
    console.log('🎉 Cleanup completed successfully!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanDriverUsers();
