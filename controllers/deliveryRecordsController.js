const { pool } = require('../config/db');

// Get delivery records for a delivery boy (from orders table)
exports.getDeliveryRecords = async (req, res) => {
  try {
    const { delivery_boy_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Query orders table directly - no separate delivery_records table needed
    // Check both driver_id (legacy) and delivered_by_user_id (new) for backward compatibility
    const [records] = await pool.query(
      `SELECT 
        id as order_id,
        customer_name,
        customer_phone,
        delivery_address,
        totalAmount as order_amount,
        delivered_at as delivery_time,
        status,
        items,
        timestamp as order_date
      FROM orders 
      WHERE (driver_id = ? OR (delivered_by_user_id = ? AND delivered_by_user_type = 'delivery_boy')) AND status = 'delivered'
      ORDER BY delivered_at DESC 
      LIMIT ? OFFSET ?`,
      [delivery_boy_id, delivery_boy_id, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE (driver_id = ? OR (delivered_by_user_id = ? AND delivered_by_user_type = \'delivery_boy\')) AND status = \'delivered\'',
      [delivery_boy_id, delivery_boy_id]
    );

    res.json({
      success: true,
      records,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Get delivery records error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch delivery records',
      error: error.message 
    });
  }
};

// Get delivery boy statistics (from orders table)
exports.getDeliveryBoyStatistics = async (req, res) => {
  try {
    const { delivery_boy_id } = req.params;
    const { month, year } = req.query;

    let query = `
      SELECT 
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as cancelled_deliveries,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN totalAmount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN 50 ELSE 0 END), 0) as total_earnings
      FROM orders 
      WHERE driver_id = ? OR (delivered_by_user_id = ? AND delivered_by_user_type = 'delivery_boy')
    `;

    const params = [delivery_boy_id, delivery_boy_id];

    // Add month/year filter if provided
    if (month && year) {
      query += ` AND MONTH(delivered_at) = ? AND YEAR(delivered_at) = ?`;
      params.push(parseInt(month), parseInt(year));
      console.log(`📅 Filtering by month: ${month}/${year}`);
    }

    const [stats] = await pool.query(query, params);

    console.log('📊 Delivery statistics for delivery boy', delivery_boy_id, ':', stats[0]);

    res.json({
      total_deliveries: parseInt(stats[0].total_deliveries) || 0,
      completed_deliveries: parseInt(stats[0].completed_deliveries) || 0,
      cancelled_deliveries: parseInt(stats[0].cancelled_deliveries) || 0,
      total_earnings: parseFloat(stats[0].total_earnings) || 0
    });

  } catch (error) {
    console.error('❌ Get delivery boy statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics',
      error: error.message 
    });
  }
};

// Get admin delivery statistics (from orders table)
exports.getAdminStatistics = async (req, res) => {
  try {
    const { admin_user_id } = req.params;
    const { month, year } = req.query;

    let query = `
      SELECT 
        COUNT(CASE WHEN status = 'delivered' AND delivered_by_user_type = 'admin' THEN 1 END) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' AND delivered_by_user_type = 'admin' THEN 1 END) as completed_deliveries,
        COUNT(CASE WHEN status = 'canceled' AND delivered_by_user_type = 'admin' THEN 1 END) as cancelled_deliveries,
        COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_by_user_type = 'admin' THEN totalAmount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_by_user_type = 'admin' THEN 50 ELSE 0 END), 0) as total_earnings
      FROM orders 
      WHERE delivered_by_user_id = ? AND delivered_by_user_type = 'admin'
    `;

    const params = [admin_user_id];

    // Add month/year filter if provided
    if (month && year) {
      query += ` AND MONTH(delivered_at) = ? AND YEAR(delivered_at) = ?`;
      params.push(parseInt(month), parseInt(year));
      console.log(`📅 Filtering admin stats by month: ${month}/${year}`);
    }

    const [stats] = await pool.query(query, params);

    console.log('📊 Admin delivery statistics for admin user', admin_user_id, ':', stats[0]);

    res.json({
      total_deliveries: parseInt(stats[0].total_deliveries) || 0,
      completed_deliveries: parseInt(stats[0].completed_deliveries) || 0,
      cancelled_deliveries: parseInt(stats[0].cancelled_deliveries) || 0,
      total_earnings: parseFloat(stats[0].total_earnings) || 0
    });

  } catch (error) {
    console.error('❌ Get admin statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch admin statistics',
      error: error.message 
    });
  }
};

// Get admin delivery records (from orders table)
exports.getAdminDeliveryRecords = async (req, res) => {
  try {
    const { admin_user_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Query orders table for admin deliveries
    const [records] = await pool.query(
      `SELECT 
        id as order_id,
        customer_name,
        customer_phone,
        delivery_address,
        totalAmount as order_amount,
        delivered_at as delivery_time,
        status,
        items,
        timestamp as order_date
      FROM orders 
      WHERE delivered_by_user_id = ? AND delivered_by_user_type = 'admin' AND status = 'delivered'
      ORDER BY delivered_at DESC 
      LIMIT ? OFFSET ?`,
      [admin_user_id, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM orders 
       WHERE delivered_by_user_id = ? AND delivered_by_user_type = 'admin' AND status = 'delivered'`,
      [admin_user_id]
    );

    res.json({
      success: true,
      records,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Get admin delivery records error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch admin delivery records',
      error: error.message 
    });
  }
};

module.exports = {
  getDeliveryRecords: exports.getDeliveryRecords,
  getDeliveryBoyStatistics: exports.getDeliveryBoyStatistics,
  getAdminStatistics: exports.getAdminStatistics,
  getAdminDeliveryRecords: exports.getAdminDeliveryRecords
};
