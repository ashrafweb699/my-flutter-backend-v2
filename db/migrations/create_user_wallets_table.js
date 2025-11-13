const { pool } = require('../../config/db');

module.exports = async function createUserWalletsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        user_id INT NOT NULL PRIMARY KEY,
        balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL
      );
    `);
    console.log('User wallets table check/creation completed');
  } catch (e) {
    console.error('Error creating user_wallets table:', e);
    throw e;
  }
};
