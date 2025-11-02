const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔧 Testing Railway MySQL Connection...\n');
  
  console.log('Configuration:');
  console.log(`  Host: ${process.env.DB_HOST}`);
  console.log(`  Port: ${process.env.DB_PORT}`);
  console.log(`  User: ${process.env.DB_USER}`);
  console.log(`  Database: ${process.env.DB_NAME}`);
  console.log(`  Password: ${'*'.repeat(process.env.DB_PASSWORD?.length || 0)}\n`);

  try {
    console.log('⏳ Connecting to database...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connection successful!\n');

    // Test query
    console.log('⏳ Running test query...');
    const [rows] = await connection.execute('SELECT DATABASE() as db, VERSION() as version, NOW() as time');
    
    console.log('✅ Query successful!');
    console.log('\nDatabase Info:');
    console.log(`  Database: ${rows[0].db}`);
    console.log(`  MySQL Version: ${rows[0].version}`);
    console.log(`  Server Time: ${rows[0].time}`);

    // List tables
    console.log('\n⏳ Checking existing tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    if (tables.length > 0) {
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
      });
    } else {
      console.log('ℹ️  No tables found. They will be created when server starts.');
    }

    await connection.end();
    console.log('\n✅ Connection test completed successfully!');
    console.log('\n🚀 You can now start the server with: npm start');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Database credentials in .env file');
    console.error('  2. Network connection');
    console.error('  3. Railway database is running');
    process.exit(1);
  }
}

testConnection();
