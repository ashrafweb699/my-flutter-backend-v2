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
      try {
        const { creditUser } = require('../services/walletService');
        if (amount) {
          await creditUser(user_id, Number(amount), { reference: `TID:${tid.trim()}`, submissionId: result.insertId });
        }
      } catch (ce) { console.error('wallet credit on submit error', ce.message); }
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
      `SELECT id, user_id, status, matched_sms_id, amount_claimed, created_at FROM manual_payment_submissions WHERE tid_submitted = ? ORDER BY id DESC LIMIT 1`,
      [tid]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });

    let current = rows[0];

    // If not matched yet, try instant reconciliation
    if (current.status !== 'matched') {
      // 1) Exact match on parsed_tid
      const [exact] = await pool.query(
        `SELECT id FROM incoming_payment_sms WHERE parsed_tid = ? ORDER BY id DESC LIMIT 1`,
        [tid.trim()]
      );
      if (exact.length > 0) {
        await pool.query(
          `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id = ?`,
          [exact[0].id, current.id]
        );
        current.status = 'matched';
        current.matched_sms_id = exact[0].id;
        try {
          const { creditUser } = require('../services/walletService');
          if (current.amount_claimed) {
            await creditUser(current.user_id, Number(current.amount_claimed), { reference: `TID:${tid.trim()}`, submissionId: current.id });
          }
        } catch (ce) { console.error('wallet credit on status-exact error', ce.message); }
        return res.json({ id: current.id, status: current.status, matched_sms_id: current.matched_sms_id });
      }

      // 2) Fuzzy: raw_text contains TID
      const [byText] = await pool.query(
        `SELECT id FROM incoming_payment_sms WHERE raw_text LIKE ? ORDER BY id DESC LIMIT 1`,
        ['%' + tid.trim() + '%']
      );
      if (byText.length > 0) {
        await pool.query(
          `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id = ?`,
          [byText[0].id, current.id]
        );
        current.status = 'matched';
        current.matched_sms_id = byText[0].id;
        try {
          const { creditUser } = require('../services/walletService');
          if (current.amount_claimed) {
            await creditUser(current.user_id, Number(current.amount_claimed), { reference: `TID:${tid.trim()}`, submissionId: current.id });
          }
        } catch (ce) { console.error('wallet credit on status-text error', ce.message); }
        return res.json({ id: current.id, status: current.status, matched_sms_id: current.matched_sms_id });
      }

      // 3) Amount + time-window within last 6 hours
      if (current.amount_claimed != null) {
        const [range] = await pool.query(
          `SELECT id FROM incoming_payment_sms 
             WHERE amount = ? 
               AND tx_time IS NOT NULL
               AND tx_time BETWEEN (NOW() - INTERVAL 6 HOUR) AND NOW()
             ORDER BY id DESC LIMIT 1`,
          [current.amount_claimed]
        );
        if (range.length > 0) {
          await pool.query(
            `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id = ?`,
            [range[0].id, current.id]
          );
          current.status = 'matched';
          current.matched_sms_id = range[0].id;
          try {
            const { creditUser } = require('../services/walletService');
            if (current.amount_claimed) {
              await creditUser(current.user_id, Number(current.amount_claimed), { reference: `TID:${tid.trim()}`, submissionId: current.id });
            }
          } catch (ce) { console.error('wallet credit on status-amount error', ce.message); }
        }
      }
    }

    res.json({ id: current.id, status: current.status, matched_sms_id: current.matched_sms_id });
  } catch (e) {
    console.error('checkTIDStatus error', e);
    res.status(500).json({ message: 'Server error' });
  }
};
