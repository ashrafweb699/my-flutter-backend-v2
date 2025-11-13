const { pool } = require('../config/db');

async function reconcileOnce(options = {}) {
  const windowHours = options.windowHours || 6; // time window for fuzzy matching
  try {
    // Fetch pending submissions
    const [subs] = await pool.query(
      `SELECT id, tid_submitted, amount_claimed, wallet, created_at
       FROM manual_payment_submissions
       WHERE status = 'pending'
       ORDER BY id ASC
       LIMIT 100`
    );

    for (const s of subs) {
      const tid = (s.tid_submitted || '').trim();
      if (!tid) continue;

      // 1) Exact TID match first
      const [exact] = await pool.query(
        `SELECT id FROM incoming_payment_sms WHERE parsed_tid = ? ORDER BY id DESC LIMIT 1`,
        [tid]
      );
      if (exact.length > 0) {
        await pool.query(
          `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id = ?`,
          [exact[0].id, s.id]
        );
        continue;
      }

      // 2) Fuzzy: raw_text contains TID (handles cases where parsed_tid missing)
      const [byText] = await pool.query(
        `SELECT id FROM incoming_payment_sms WHERE raw_text LIKE ? ORDER BY id DESC LIMIT 1`,
        ['%' + tid + '%']
      );
      if (byText.length > 0) {
        await pool.query(
          `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id = ?`,
          [byText[0].id, s.id]
        );
        continue;
      }

      // 3) Amount + time-window match (best-effort) when amount is provided
      if (s.amount_claimed != null) {
        const [range] = await pool.query(
          `SELECT id FROM incoming_payment_sms 
             WHERE amount = ? 
               AND tx_time IS NOT NULL
               AND tx_time BETWEEN (NOW() - INTERVAL ? HOUR) AND NOW()
             ORDER BY id DESC LIMIT 1`,
          [s.amount_claimed, windowHours]
        );
        if (range.length > 0) {
          await pool.query(
            `UPDATE manual_payment_submissions SET status = 'matched', matched_sms_id = ?, updated_at = NOW() WHERE id = ?`,
            [range[0].id, s.id]
          );
          continue;
        }
      }
      // else keep pending
    }
  } catch (e) {
    console.error('Payment reconciliation error:', e.message);
  }
}

function start(intervalMs = 60000) {
  console.log(`Payment reconciliation worker started (every ${intervalMs / 1000}s)`);
  setInterval(() => reconcileOnce().catch(() => {}), intervalMs);
}

module.exports = { start, reconcileOnce };
