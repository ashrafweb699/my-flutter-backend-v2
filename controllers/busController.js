const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { sendNotification } = require('../utils/notifications');

const JWT_SECRET = process.env.JWT_SECRET || 'gwadar_online_bazaar_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(userId, userType) {
  return jwt.sign({ id: userId, type: userType }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

exports.register = async (req, res) => {
  try {
    const { name, email, phone, cnic, password, transport_name, bus_number, fcm_token } = req.body;
    if (!name || !email || !phone || !password || !transport_name || !bus_number) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [userResult] = await pool.query(
      'INSERT INTO users (name, email, password, user_type, fcm_token) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, 'bus_manager', fcm_token || null]
    );
    const userId = userResult.insertId;
    console.log(`✅ Created bus manager user ${userId} with FCM token: ${fcm_token ? fcm_token.substring(0, 20) + '...' : 'none'}`);

    // Build image URLs if files were uploaded
    const makeRel = (p) => {
      const uploadPath = p.replace(/\\/g, '/');
      const relativePath = uploadPath.replace('./uploads/', '').replace('uploads/', '');
      return `uploads/${relativePath}`;
    };



 

 

 

    let profileImageUrl = req.body.profile_image_url || null;
    let cnicFrontUrl = null;
    let cnicBackUrl = null;
    if (req.files) {
      if (req.files.profile_image && req.files.profile_image[0]?.path) {
        profileImageUrl = makeRel(req.files.profile_image[0].path);
      }
      if (req.files.cnic_front_image && req.files.cnic_front_image[0]?.path) {
        cnicFrontUrl = makeRel(req.files.cnic_front_image[0].path);
      }
      if (req.files.cnic_back_image && req.files.cnic_back_image[0]?.path) {
        cnicBackUrl = makeRel(req.files.cnic_back_image[0].path);
      }
    }
    await pool.query(
      `INSERT INTO bus_managers (user_id, name, email, phone, cnic, password, transport_name, bus_number, profile_image_url, cnic_front_image, cnic_back_image, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, name, email, phone, (cnic ?? null), hashed, transport_name, bus_number, profileImageUrl, cnicFrontUrl, cnicBackUrl]
    );

    // Notify admins via FCM and bell notification (robust path)
    try {
      const [admins] = await pool.query("SELECT id, fcm_token FROM users WHERE user_type='admin'");
      const tokens = admins.map(a => a.fcm_token).filter(t => t && t.trim() !== '');

      // Insert bell notifications for all admins
      for (const adminRow of admins) {
        try {
          await pool.query(
            `INSERT INTO user_notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, 'new_bus_manager', 0)`,
            [adminRow.id, 'New Bus Manager Registration', `${name} (${transport_name}) applied for approval.`]
          );
        } catch (bellErr) {
          console.error('Failed to insert admin bell notification:', bellErr.message);
        }
      }

      // Prefer utils notifications (admin SDK initialized internally)
      const { sendMulticastNotification, sendNotification } = require('../utils/notifications');
      if (tokens.length) {
        try {
          await sendMulticastNotification({
            tokens,
            title: 'New Bus Manager Registration',
            body: `${name} (${transport_name}) applied for approval.`,
            data: { type: 'new_bus_manager', entity: 'bus_manager' },
          });
        } catch (multiErr) {
          console.error('Multicast notify failed, falling back to single-send:', multiErr.message);
          // Fallback: send to each token individually
          for (const t of tokens) {
            try {
              await sendNotification({
                token: t,
                title: 'New Bus Manager Registration',
                body: `${name} (${transport_name}) applied for approval.`,
                data: { type: 'new_bus_manager', entity: 'bus_manager' },
              });
            } catch (singleErr) {
              console.error('Single notify failed:', singleErr.message);
            }
          }
        }
      }

      // Also attempt topic as a backup channel
      try {
        if (global.firebaseAdmin) {
          await global.firebaseAdmin.messaging().send({
            topic: 'admin_notifications',
            notification: { title: 'New Bus Manager Registration', body: `${name} (${transport_name}) applied for approval.` },
            android: { notification: { channelId: 'high_importance_channel' }, priority: 'high' },
            data: { type: 'new_bus_manager', entity: 'bus_manager' },
          });
        }
      } catch (topicErr) {
        console.warn('Topic notify failed (admin_notifications):', topicErr.message);
      }
    } catch (e) { console.error('Bus manager admin notify error:', e.message); }

    return res.status(201).json({ success: true, message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    console.error('bus.register error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND user_type = "bus_manager"', [email]);
    if (!users.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = users[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Check approval status
    const [mgrRows] = await pool.query('SELECT * FROM bus_managers WHERE user_id = ?', [user.id]);
    if (!mgrRows.length) return res.status(400).json({ success: false, message: 'Profile not found' });
    const manager = mgrRows[0];
    if ((manager.approval_status || 'pending') !== 'approved') {
      return res.status(403).json({ success: false, message: `Account ${manager.approval_status}` });
    }
    const token = generateToken(user.id, user.user_type);

    return res.json({ success: true, token, manager });
  } catch (err) {
    console.error('bus.login error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Admin: list bus managers (top-level)
exports.listManagers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT bm.*, u.name AS user_name, u.email AS user_email
      FROM bus_managers bm
      JOIN users u ON u.id = bm.user_id
      ORDER BY bm.created_at DESC
    `);
    const norm = (p, req) => {
      if (!p) return null;
      const s = p.toString();
      if (s.startsWith('http')) return s;
      const rel = s.startsWith('uploads/') ? s : `uploads/${s}`;
      return `${req.protocol}://${req.get('host')}/${rel}`;
    };
    const data = rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      name: r.name || r.user_name,
      email: r.email || r.user_email,
      phone: r.phone,
      transport_name: r.transport_name,
      bus_number: r.bus_number,
      approval_status: r.approval_status,
      profile_image_url: norm(r.profile_image_url, req),
      cnic_front_image: norm(r.cnic_front_image, req),
      cnic_back_image: norm(r.cnic_back_image, req),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return res.json(data);
  } catch (e) {
    console.error('listManagers error', e);
    return res.status(500).json({ message: 'Failed to fetch bus managers' });
  }
};

// Admin: update approval (top-level)
exports.updateApproval = async (req, res) => {
  try {
    const id = req.params.id;
    const { approval } = req.body; // 'YES' | 'NO' | 'pending'
    const status = approval === 'YES' ? 'approved' : approval === 'NO' ? 'rejected' : 'pending';

    const [rows] = await pool.query('SELECT * FROM bus_managers WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    
    const bm = rows[0];
    
    // ✅ If rejected, delete bus manager and user records
    if (approval === 'NO') {
      console.log(`❌ Bus manager ${id} rejected - deleting records`);
      
      // Get FCM token before deletion for notification
      const [users] = await pool.query('SELECT id, fcm_token FROM users WHERE id=?', [bm.user_id]);
      const userFcmToken = users.length ? users[0].fcm_token : null;
      
      // Send rejection notification before deletion
      if (userFcmToken && global.firebaseAdmin) {
        try {
          await global.firebaseAdmin.messaging().send({
            token: userFcmToken,
            notification: { title: 'Application Rejected', body: 'Afsos! Aap ka bus manager application reject ho gaya hai. Admin se contact karein.' },
            data: { type: 'bus_manager_rejection', status: 'rejected' }
          });
          console.log(`✅ Sent rejection notification to bus manager ${id}`);
        } catch (notifError) {
          console.error('Error sending rejection notification:', notifError);
        }
      }
      
      // Delete bus manager record
      await pool.query('DELETE FROM bus_managers WHERE id = ?', [id]);
      
      // Delete user record
      if (bm.user_id) {
        await pool.query('DELETE FROM users WHERE id = ?', [bm.user_id]);
        console.log(`✅ Deleted user ${bm.user_id} from users table`);
      }
      
      return res.json({ success: true, message: 'Bus manager application rejected and records deleted', status: 'rejected' });
    }

    await pool.query('UPDATE bus_managers SET approval_status=? WHERE id=?', [status, id]);

    try {
      const bm = rows[0];
      const [users] = await pool.query('SELECT id, fcm_token FROM users WHERE id=?', [bm.user_id]);
      if (users.length && users[0].fcm_token && global.firebaseAdmin) {
        await global.firebaseAdmin.messaging().send({
          token: users[0].fcm_token,
          notification: { title: 'Application Update', body: `Your bus manager application is ${status}.` },
          android: { notification: { channelId: 'high_importance_channel' }, priority: 'high' },
          data: { type: 'bus_manager_approval', status: String(status), entity: 'bus_manager', target_id: String(id), click_action: 'FLUTTER_NOTIFICATION_CLICK' }
        });
      }
      await pool.query(
        `INSERT INTO user_notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, 'bus_manager_approval', 0)`,
        [bm.user_id, 'Application Update', `Your bus manager application is ${status}.`]
      );
    } catch (e) { console.error('Notify bus manager error:', e.message); }

    res.json({ success: true, status });
  } catch (e) {
    return res.status(500).json({ message: 'Approval update failed', error: e.message });
  }
};

exports.addSchedule = (io) => async (req, res) => {
  try {
    const { bus_manager_id, bus_number, route_from, route_to, timing, per_seat_rate, available_seats } = req.body;
    if (!bus_manager_id || !bus_number || !route_from || !route_to || !timing) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO bus_schedules (bus_manager_id, bus_number, route_from, route_to, timing, per_seat_rate, available_seats)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bus_manager_id, bus_number, route_from, route_to, timing, per_seat_rate || 0, available_seats || 45]
    );
    const scheduleId = result.insertId;

    // Initialize 45 seats if not exist
    const seats = Array.from({ length: 45 }, (_, i) => [scheduleId, i + 1, 'available']);
    await pool.query('INSERT INTO bus_seats (schedule_id, seat_number, status) VALUES ?',[seats]);

    return res.status(201).json({ success: true, id: scheduleId });
  } catch (err) {
    console.error('bus.addSchedule error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const { bus_manager_id } = req.params;
    const [rows] = await pool.query('SELECT * FROM bus_schedules WHERE bus_manager_id = ? ORDER BY id DESC', [bus_manager_id]);
    return res.json(rows);
  } catch (err) {
    console.error('bus.getSchedules error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getSeats = async (req, res) => {
  try {
    const { schedule_id } = req.params;
    const [rows] = await pool.query('SELECT seat_number, status, booked_by FROM bus_seats WHERE schedule_id = ? ORDER BY seat_number ASC', [schedule_id]);

    // If seats not initialized for some reason, create them now
    if (!rows.length) {
      const seats = Array.from({ length: 45 }, (_, i) => [schedule_id, i + 1, 'available']);
      await pool.query('INSERT INTO bus_seats (schedule_id, seat_number, status) VALUES ?', [seats]);
      const [fresh] = await pool.query('SELECT seat_number, status, booked_by FROM bus_seats WHERE schedule_id = ? ORDER BY seat_number ASC', [schedule_id]);
      return res.json(fresh);
    }

    return res.json(rows);
  } catch (err) {
    console.error('bus.getSeats error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Manager: list bookings for this bus manager
exports.getBookingsByManager = async (req, res) => {
  try {
    const { bus_manager_id } = req.params;
    const [rows] = await pool.query(
      `SELECT bb.*, 
              u.name AS user_name, 
              u.email AS user_email, 
              up.mobile_number AS user_phone,
              up.address AS user_address
       FROM bus_bookings bb
       JOIN users u ON u.id = bb.user_id
       LEFT JOIN user_profile up ON up.user_id = u.id
       WHERE bb.bus_manager_id = ?
       ORDER BY bb.created_at DESC`,
      [bus_manager_id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('bus.getBookingsByManager error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
// Manager: update booking status (confirm/reject/delivered)
exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = req.params.id;
    let { status, message } = req.body || {};
    status = (status || '').toString().toLowerCase();
    if (!['confirmed', 'rejected', 'canceled', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    // Resolve manager by logged in user
    const userId = req.user?.id;
    const [[mgr]] = await pool.query('SELECT id FROM bus_managers WHERE user_id = ?', [userId]);
    if (!mgr) return res.status(403).json({ success: false, message: 'Not a bus manager' });

    // Fetch booking and authorize
    const [[booking]] = await pool.query('SELECT * FROM bus_bookings WHERE id = ?', [bookingId]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (String(booking.bus_manager_id) !== String(mgr.id)) {
      return res.status(403).json({ success: false, message: 'Not allowed to modify this booking' });
    }

    // Normalize status text stored
    let newStatus = status;
    if (newStatus === 'rejected' || newStatus === 'cancelled') newStatus = 'canceled';
    await pool.query('UPDATE bus_bookings SET status = ? WHERE id = ?', [newStatus, bookingId]);

    // Notify user via FCM and bell
    try {
      const [[u]] = await pool.query('SELECT id, fcm_token, name FROM users WHERE id = ?', [booking.user_id]);
      const title = `Bus Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
      const body = `Your booking ${booking.route_from} → ${booking.route_to} • ${booking.timing} has been ${newStatus}.` + (message ? ` Note: ${message}` : '');

      if (u && u.fcm_token) {
        await sendNotification({
          token: u.fcm_token,
          title,
          body,
          data: { type: 'bus_booking_status', booking_id: String(bookingId), status: newStatus },
        });
      }
      await pool.query(
        `INSERT INTO user_notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, 'bus_booking_status', 0)`,
        [booking.user_id, title, body]
      );
    } catch (notifyErr) {
      console.warn('Notify user booking status failed:', notifyErr.message);
    }

    return res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('bus.updateBookingStatus error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// User: list own bus bookings (top-level)
exports.getBookingsByUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const [rows] = await pool.query(
      `SELECT bb.*, bm.transport_name, bm.bus_number, bs.per_seat_rate,
              bs.route_from, bs.route_to, bs.timing
       FROM bus_bookings bb
       JOIN bus_schedules bs ON bs.id = bb.schedule_id
       JOIN bus_managers bm ON bm.id = bb.bus_manager_id
       WHERE bb.user_id = ?
       ORDER BY bb.created_at DESC`, [userId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('bus.getBookingsByUser error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// User: cancel own booking (top-level)
exports.cancelBookingByUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const bookingId = req.params.id;
    const [[booking]] = await pool.query('SELECT * FROM bus_bookings WHERE id = ?', [bookingId]);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (String(booking.user_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    // Update booking status
    await pool.query('UPDATE bus_bookings SET status = ? WHERE id = ?', ['canceled', bookingId]);

    // Free seats
    try {
      const seatStr = (booking.selected_seats || '').toString();
      const seats = seatStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (seats.length) {
        await pool.query('UPDATE bus_seats SET status = "available", booked_by = NULL WHERE schedule_id = ? AND seat_number IN (?)', [booking.schedule_id, seats]);
      }
    } catch (e) { console.warn('Free seats failed:', e.message); }

    // Notify bus manager
    try {
      const [[mgr]] = await pool.query('SELECT u.fcm_token, bm.transport_name FROM bus_managers bm JOIN users u ON u.id = bm.user_id WHERE bm.id = ?', [booking.bus_manager_id]);
      if (mgr && mgr.fcm_token) {
        await sendNotification({
          token: mgr.fcm_token,
          title: 'Bus Booking Cancelled',
          body: `A user cancelled seats for ${booking.route_from} → ${booking.route_to} • ${booking.timing}.`,
          data: { type: 'bus_booking_cancelled', booking_id: String(bookingId) },
        });
      }
    } catch (e) { console.warn('Notify manager cancel failed:', e.message); }

    return res.json({ success: true, status: 'canceled' });
  } catch (err) {
    console.error('bus.cancelBookingByUser error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const makeRel = (p) => {
  const uploadPath = p.replace(/\\/g, '/');
  const relativePath = uploadPath.replace('./uploads/', '').replace('uploads/', '');
  return `uploads/${relativePath}`;
};

exports.availableBuses = async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (from) { where += ' AND bs.route_from = ?'; params.push(from); }
    if (to) { where += ' AND bs.route_to = ?'; params.push(to); }
    const [rows] = await pool.query(
      `SELECT bs.*, bm.transport_name, bm.bus_number AS profile_bus_number, bm.name AS manager_name
       FROM bus_schedules bs
       JOIN bus_managers bm ON bm.id = bs.bus_manager_id
       ${where}
       ORDER BY bs.created_at DESC`, params);
    return res.json(rows);
  } catch (err) {
    console.error('bus.availableBuses error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.bookSeats = (io) => async (req, res) => {
  try {
    const { user_id, bus_manager_id, schedule_id, selected_seats, route_from, route_to, timing, total_amount, latitude, longitude } = req.body;
    if (!user_id || !bus_manager_id || !schedule_id || !selected_seats || !Array.isArray(selected_seats) || selected_seats.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check seat availability
    const [seats] = await pool.query('SELECT seat_number, status FROM bus_seats WHERE schedule_id = ? AND seat_number IN (?)', [schedule_id, selected_seats]);
    const anyBooked = seats.some(s => s.status === 'booked');
    if (anyBooked) return res.status(409).json({ success: false, message: 'Some seats are already booked' });

    // Book seats
    await pool.query('UPDATE bus_seats SET status = "booked", booked_by = ? WHERE schedule_id = ? AND seat_number IN (?)', [user_id, schedule_id, selected_seats]);

    // Create booking record
    const [result] = await pool.query(
      `INSERT INTO bus_bookings (user_id, bus_manager_id, schedule_id, total_seats, selected_seats, route_from, route_to, timing, total_amount, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, bus_manager_id, schedule_id, selected_seats.length, selected_seats.join(','), route_from, route_to, timing, total_amount || 0, latitude || null, longitude || null]
    );

    // Emit socket event for real-time updates
    if (io) io.emit('bus_seats_update', { schedule_id, seats: selected_seats, status: 'booked' });

    // Send FCM notification to bus manager (if token exists)
    try {
      const [[mgr]] = await pool.query('SELECT bm.transport_name, u.fcm_token FROM bus_managers bm JOIN users u ON u.id = bm.user_id WHERE bm.id = ?', [bus_manager_id]);
      if (mgr && mgr.fcm_token) {
        await sendNotification({
          token: mgr.fcm_token,
          title: 'New Bus Booking',
          body: `${mgr.transport_name}: ${selected_seats.length} seats booked`,
          data: { type: 'bus_booking', schedule_id: String(schedule_id) }
        });
      }
    } catch (e) { console.warn('FCM send failed (manager):', e.message); }

    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('bus.bookSeats error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
