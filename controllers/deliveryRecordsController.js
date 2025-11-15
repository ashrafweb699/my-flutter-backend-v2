const { pool } = require('../config/db');

// Get delivery records for a delivery boy (from orders table)
exports.getDeliveryRecords = async (req, res) => {
  try {
    const { delivery_boy_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Query orders table directly - no separate delivery_records table needed
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
      WHERE driver_id = ? AND status = 'delivered'
      ORDER BY delivered_at DESC 
      LIMIT ? OFFSET ?`,
      [delivery_boy_id, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM orders WHERE driver_id = ? AND status = \'delivered\'',
      [delivery_boy_id]
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

    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as total_deliveries,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries,
        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as cancelled_deliveries,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN totalAmount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN 50 ELSE 0 END), 0) as total_earnings
      FROM orders 
      WHERE driver_id = ?
    `;

    const [stats] = await pool.query(query, [delivery_boy_id]);

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

module.exports = {
  getDeliveryRecords: exports.getDeliveryRecords,
  getDeliveryBoyStatistics: exports.getDeliveryBoyStatistics
};
