const { pool } = require('../config/db');

async function ensureWallet(userId) {
  await pool.query(
    `INSERT INTO user_wallets (user_id, balance, created_at) VALUES (?, 0.00, NOW())
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [userId]
  );
}

async function creditUser(userId, amount, { reference = null, submissionId = null } = {}) {
  if (!userId || !amount || amount <= 0) return false;
  await ensureWallet(userId);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (submissionId) {
      const [exists] = await conn.query(
        `SELECT id FROM user_wallet_transactions WHERE submission_id = ? LIMIT 1`,
        [submissionId]
      );
      if (exists.length) {
        await conn.rollback();
        conn.release();
        return true; // already credited idempotent
      }
    }

    await conn.query(
      `INSERT INTO user_wallet_transactions (user_id, amount, type, reference, submission_id, created_at)
       VALUES (?, ?, 'credit', ?, ?, NOW())`,
      [userId, amount, reference, submissionId]
    );
    await conn.query(
      `UPDATE user_wallets SET balance = balance + ?, updated_at = NOW() WHERE user_id = ?`,
      [amount, userId]
    );
    await conn.commit();
    return true;
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('walletService.creditUser error', e.message);
    return false;
  } finally {
    conn.release();
  }
}

async function resetWallet(userId) {
  await ensureWallet(userId);
  await pool.query(`UPDATE user_wallets SET balance = 0.00, updated_at = NOW() WHERE user_id = ?`, [userId]);
}

async function getBalance(userId) {
  const [rows] = await pool.query(`SELECT balance FROM user_wallets WHERE user_id = ?`, [userId]);
  if (!rows.length) return 0;
  return Number(rows[0].balance);
}

module.exports = { ensureWallet, creditUser, resetWallet, getBalance };
