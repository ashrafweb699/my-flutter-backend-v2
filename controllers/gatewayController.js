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
    try {
      await pool.query(
        `INSERT INTO incoming_payment_sms (device_id, wallet, raw_text, parsed_tid, amount, currency, sender_msisdn, tx_time, hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [device_id, wallet || 'unknown', raw_text, parsed_tid || null, amount || null, currency || 'PKR', normalizedMsisdn, tx_time || null, hash]
      );
    } catch (dup) {
      // ignore duplicates on hash
    }
    res.status(201).json({ success: true });
  } catch (e) {
    console.error('ingestIncomingSMS error', e);
    res.status(500).json({ message: 'Server error' });
  }
};
