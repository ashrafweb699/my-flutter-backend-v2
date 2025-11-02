const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT db.*, u.name, u.email AS user_email
      FROM delivery_boys db
      LEFT JOIN users u ON db.user_id = u.id
      ORDER BY db.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch delivery boys', error: e.message });
  }
};

// Get delivery boy profile by user_id
exports.getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query(
      `SELECT db.*, u.name AS user_name, u.email AS user_email
       FROM delivery_boys db
       JOIN users u ON db.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Delivery boy not found' });
    }

    const row = rows[0];

    const normalizePath = (p) => {
      if (!p) return null;
      const s = p.toString();
      if (s.startsWith('http')) return s;
      const rel = s.startsWith('uploads/') ? s : `uploads/${s}`;
      return `${req.protocol}://${req.get('host')}/${rel}`;
    };

    return res.json({
      success: true,
      deliveryBoy: {
        id: row.id,
        userId: row.user_id,
        name: row.full_name || row.user_name,
        email: row.email || row.user_email,
        phone: row.mobile_number,
        approval: row.approval_status,
        profileImage: normalizePath(row.profile_image),
        cnicFront: normalizePath(row.cnic_front_image),
        cnicBack: normalizePath(row.cnic_back_image),
        rating: parseFloat(row.rating || 0),
        onlineStatus: row.online_status || 'offline',
        currentLatitude: row.current_latitude ? parseFloat(row.current_latitude) : null,
        currentLongitude: row.current_longitude ? parseFloat(row.current_longitude) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (e) {
    console.error('Error fetching delivery boy profile:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile', error: e.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { full_name, email, mobile_number, cnic_front_image, cnic_back_image, password } = req.body;
    if (!full_name || !email || !mobile_number || !cnic_front_image || !cnic_back_image || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create or update user with user_type d_boy
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    let userId;
    if (existing.length) {
      userId = existing[0].id;
      await pool.query("UPDATE users SET name=?, user_type='d_boy' WHERE id=?", [full_name, userId]);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        "INSERT INTO users (name, email, password, user_type) VALUES (?, ?, ?, 'd_boy')",
        [full_name, email, hashed]
      );
      userId = result.insertId;
    }

    // Insert delivery boy row
    const [ins] = await pool.query(
      `INSERT INTO delivery_boys (user_id, full_name, email, mobile_number, cnic_front_image, cnic_back_image, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), email=VALUES(email), mobile_number=VALUES(mobile_number), cnic_front_image=VALUES(cnic_front_image), cnic_back_image=VALUES(cnic_back_image), updated_at=CURRENT_TIMESTAMP`,
      [userId, full_name, email, mobile_number, cnic_front_image, cnic_back_image]
    );

    // Notify admins via FCM and bell
    try {
      const [admins] = await pool.query("SELECT id, fcm_token FROM users WHERE user_type='admin' AND IFNULL(fcm_token,'')<>''");
      const tokens = admins.map(a => a.fcm_token).filter(Boolean);
      if (global.firebaseAdmin && tokens.length) {
        await global.firebaseAdmin.messaging().sendMulticast({
          notification: { title: 'New Delivery Boy Registration', body: `${full_name} applied for approval.` },
          android: { notification: { channelId: 'high_importance_channel' }, priority: 'high' },
          data: { type: 'new_delivery_boy' },
          tokens,
        });
      }
      for (const admin of admins) {
        await pool.query(
          `INSERT INTO user_notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, 'new_delivery_boy', 0)`,
          [admin.id, 'New Delivery Boy Registration', `${full_name} applied for approval.`]
        );
      }
    } catch (e) {
      console.error('Delivery boy admin notify error:', e.message);
    }

    res.status(201).json({ success: true, user_id: userId, message: 'Registration submitted. Awaiting admin approval.' });
  } catch (e) {
    res.status(500).json({ message: 'Registration failed', error: e.message });
  }
};

exports.updateApproval = async (req, res) => {
  try {
    const id = req.params.id;
    const { approval } = req.body; // 'YES' | 'NO' | 'pending'
    const status = approval === 'YES' ? 'approved' : approval === 'NO' ? 'rejected' : 'pending';

    const [rows] = await pool.query('SELECT * FROM delivery_boys WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });

    await pool.query('UPDATE delivery_boys SET approval_status=? WHERE id=?', [status, id]);

    // Update user_type remains d_boy; optionally set flags

    // Notify the delivery boy if he has fcm_token
    try {
      const dboy = rows[0];
      const [users] = await pool.query('SELECT id, fcm_token FROM users WHERE email=?', [dboy.email]);
      if (users.length && users[0].fcm_token && global.firebaseAdmin) {
        await global.firebaseAdmin.messaging().send({
          token: users[0].fcm_token,
          notification: { title: 'Application Update', body: `Your delivery boy application is ${status}.` },
          android: { notification: { channelId: 'high_importance_channel' }, priority: 'high' },
          data: {
            type: 'delivery_boy_approval',
            status: String(status),
            route: 'delivery_boy_approval',
            entity: 'delivery_boy',
            target_id: String(id),
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
        });
      }
    } catch (e) { console.error('Notify delivery boy error:', e.message); }

    // Create bell notification for the delivery boy user
    try {
      await pool.query(
        `INSERT INTO user_notifications (user_id, title, message, type, is_read)
         VALUES (?, ?, ?, 'delivery_boy_approval', 0)`,
        [users.length ? users[0].id : dboy.user_id, 'Application Update', `Your delivery boy application is ${status}.`]
      );
    } catch (e2) {
      console.error('Failed to insert delivery boy bell notification:', e2.message);
    }

    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ message: 'Approval update failed', error: e.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [userRows] = await pool.query("SELECT id, password, name FROM users WHERE email=? AND user_type='d_boy'", [email]);
    if (!userRows.length) return res.status(404).json({ success: false, message: 'Account not found' });

    const [dbRows] = await pool.query('SELECT approval_status, full_name FROM delivery_boys WHERE user_id=?', [userRows[0].id]);
    if (!dbRows.length) return res.status(400).json({ success: false, message: 'Profile not found' });
    if (dbRows[0].approval_status !== 'approved') {
      return res.status(403).json({ success: false, message: `Account ${dbRows[0].approval_status}` });
    }

    // verify password
    const ok = await bcrypt.compare(password || '', userRows[0].password || '');
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const name = dbRows[0].full_name || userRows[0].name || email;
    res.json({ success: true, deliveryBoy: { id: userRows[0].id, userId: userRows[0].id, name, email } });
  } catch (e) {
    res.status(500).json({ message: 'Login failed', error: e.message });
  }
};

// Check-email endpoint
exports.checkEmail = async (req, res) => {
  try {
    const email = (req.query.email || '').trim();
    if (!email) return res.json({ exists: false, approval: null });
    const [u] = await pool.query("SELECT id FROM users WHERE email=? AND user_type='d_boy'", [email]);
    if (!u.length) return res.json({ exists: false, approval: null });
    const [dbRows] = await pool.query('SELECT approval_status FROM delivery_boys WHERE user_id=?', [u[0].id]);
    const approval = dbRows.length ? dbRows[0].approval_status : 'pending';
    return res.json({ exists: true, approval });
  } catch (e) {
    return res.status(500).json({ exists: false, approval: null, error: e.message });
  }
};


