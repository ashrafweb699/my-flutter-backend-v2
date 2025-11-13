const { pool } = require('../../config/db');

module.exports = async function createUserWalletTransactionsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        type ENUM('credit','debit') NOT NULL DEFAULT 'credit',
        reference VARCHAR(100) NULL,
        submission_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_submission (submission_id)
      );
    `);
    console.log('User wallet transactions table check/creation completed');
  } catch (e) {
    console.error('Error creating user_wallet_transactions table:', e);
    throw e;
  }
};
