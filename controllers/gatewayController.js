const { pool } = require('../config/db');
const crypto = require('crypto');

function normalizeMsisdn(msisdn) {
  if (!msisdn) return null;
  let m = ('' + msisdn).replace(/[^0-9+]/g, '');
  if (m.startsWith('00')) m = m.slice(2);
  if (m.startsWith('+')) m = m.slice(1);
  if (m.startsWith('03') && m.length === 11) return '92' + m.slice(1);
  if (m.startsWith('92') && m.length === 12) return m;
  return m;
}

exports.fetchOutbox = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const [rows] = await pool.query(
      `SELECT * FROM otp_outbox WHERE status = 'pending' ORDER BY id ASC LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (e) {
    console.error('fetchOutbox error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateOutboxStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, error } = req.body || {};
    if (!['pending','sent','delivered','failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const fields = ['status = ?'];
    const params = [status];
    if (error) { fields.push('last_error = ?'); params.push(String(error).slice(0,255)); }
    if (status === 'failed' || status === 'sent') { fields.push('attempts = attempts + 1'); }
    params.push(id);
    const [r] = await pool.query(`UPDATE otp_outbox SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    res.json({ success: r.affectedRows === 1 });
  } catch (e) {
    console.error('updateOutboxStatus error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.ingestIncomingSMS = async (req, res) => {
  try {
    const { device_id, wallet, raw_text, parsed_tid, amount, currency, sender_msisdn, tx_time } = req.body || {};
    if (!device_id || !raw_text) return res.status(400).json({ message: 'device_id and raw_text required' });
    const normalizedMsisdn = normalizeMsisdn(sender_msisdn);
    const hash = crypto.createHash('sha256').update((raw_text || '') + '|' + (tx_time || '')).digest('hex');
    let smsId = null;
    try {
      const [ins] = await pool.query(
        `INSERT INTO incoming_payment_sms (device_id, wallet, raw_text, parsed_tid, amount, currency, sender_msisdn, tx_time, hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [device_id, wallet || 'unknown', raw_text, parsed_tid || null, amount || null, currency || 'PKR', normalizedMsisdn, tx_time || null, hash]
      );
      smsId = ins.insertId;
    } catch (dup) {
      // ignore duplicates on hash
      const [exists] = await pool.query(`SELECT id FROM incoming_payment_sms WHERE hash = ? ORDER BY id DESC LIMIT 1`, [hash]);
      if (exists.length) smsId = exists[0].id;
    }

    // Instant reconciliation
    let matchedCount = 0;
    try {
      // 1) Exact TID match
      if (parsed_tid) {
        const [upd] = await pool.query(
          `UPDATE manual_payment_submissions 
             SET status = 'matched', matched_sms_id = ?, updated_at = NOW()
           WHERE status = 'pending' AND tid_submitted = ?`,
          [smsId, parsed_tid.trim()]
        );
        matchedCount += upd.affectedRows || 0;
      }

      // 2) Fuzzy: raw_text contains submitted TID (handles cases where parsed_tid was empty)
      const [candidates] = await pool.query(
        `SELECT id, tid_submitted FROM manual_payment_submissions WHERE status = 'pending' ORDER BY id DESC LIMIT 50`
      );
      for (const row of candidates) {
        const t = (row.tid_submitted || '').trim();
        if (!t) continue;
        if ((raw_text || '').includes(t)) {
          const [u] = await pool.query(
            `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id = ?`,
            [smsId, row.id]
          );
          matchedCount += u.affectedRows || 0;
        }
      }

      // 3) Amount + time-window (6 hours)
      if (amount != null) {
        const [amtRows] = await pool.query(
          `SELECT id FROM manual_payment_submissions 
             WHERE status = 'pending' 
               AND amount_claimed = ? 
               AND created_at BETWEEN (NOW() - INTERVAL 6 HOUR) AND NOW()
           ORDER BY id DESC LIMIT 20`,
          [amount]
        );
        if (amtRows.length) {
          const ids = amtRows.map(r => r.id);
          const [u2] = await pool.query(
            `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id IN (${ids.map(()=>'?').join(',')})`,
            [smsId, ...ids]
          );
          matchedCount += u2.affectedRows || 0;
        }
      }
    } catch (re) {
      // don't fail ingest if reconciliation throws
      console.error('instant reconcile error', re.message);
    }

    res.status(201).json({ success: true, matched: matchedCount });
  } catch (e) {
    console.error('ingestIncomingSMS error', e);
    res.status(500).json({ message: 'Server error' });
  }
};
