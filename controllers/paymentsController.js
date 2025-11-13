const { pool } = require('../config/db');

function normalizeMsisdn(msisdn) {
  if (!msisdn) return null;
  let m = ('' + msisdn).replace(/[^0-9+]/g, '');
  if (m.startsWith('00')) m = m.slice(2);
  if (m.startsWith('+')) m = m.slice(1);
  if (m.startsWith('03') && m.length === 11) return '92' + m.slice(1);
  if (m.startsWith('92') && m.length === 12) return m;
  return m;
}

exports.submitManualTID = async (req, res) => {
  try {
    const { user_id, order_id, wallet, tid, amount, msisdn } = req.body || {};
    if (!user_id || !tid || !wallet) {
      return res.status(400).json({ message: 'user_id, wallet and tid are required' });
    }
    const normalized = normalizeMsisdn(msisdn);
    const [result] = await pool.query(
      `INSERT INTO manual_payment_submissions (user_id, order_id, wallet, tid_submitted, amount_claimed, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [user_id, order_id || null, (wallet || 'unknown').toLowerCase(), tid.trim(), amount || null]
    );

    // Try quick reconciliation attempt (exact TID match)
    const [sms] = await pool.query(
      `SELECT id FROM incoming_payment_sms WHERE parsed_tid = ? ORDER BY id DESC LIMIT 1`,
      [tid.trim()]
    );
    if (sms.length > 0) {
      await pool.query(
        `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ? WHERE id = ?`,
        [sms[0].id, result.insertId]
      );
      return res.status(201).json({ success: true, status: 'matched', submission_id: result.insertId });
    }

    res.status(201).json({ success: true, status: 'pending', submission_id: result.insertId });
  } catch (e) {
    console.error('submitManualTID error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.checkTIDStatus = async (req, res) => {
  try {
    const { tid } = req.params;
    const [rows] = await pool.query(
      `SELECT id, status, matched_sms_id FROM manual_payment_submissions WHERE tid_submitted = ? ORDER BY id DESC LIMIT 1`,
      [tid]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('checkTIDStatus error', e);
    res.status(500).json({ message: 'Server error' });
  }
};
