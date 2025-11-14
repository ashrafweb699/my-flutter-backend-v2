const { pool } = require('../config/db');

// Create journey record and reset seats
exports.completeJourney = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { schedule_id, bus_manager_id, notes } = req.body;

    if (!schedule_id || !bus_manager_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'schedule_id and bus_manager_id are required' 
      });
    }

    // Convert bus_manager_id to integer
    const managerIdInt = parseInt(bus_manager_id, 10);
    if (isNaN(managerIdInt)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid bus_manager_id' 
      });
    }

    // Verify bus manager exists
    const [managers] = await connection.query(
      'SELECT id FROM bus_managers WHERE id = ?',
      [managerIdInt]
    );

    if (managers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus manager not found. Please ensure you are registered as a bus manager.' 
      });
    }

    await connection.beginTransaction();

    // Get schedule details
    const [schedules] = await connection.query(
      'SELECT * FROM bus_schedules WHERE id = ?',
      [schedule_id]
    );

    if (schedules.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Schedule not found' 
      });
    }

    const schedule = schedules[0];

    // Count booked seats
    const [seatStats] = await connection.query(
      `SELECT 
        COUNT(*) as total_seats,
        SUM(CASE WHEN status = 'booked' THEN 1 ELSE 0 END) as booked_seats,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_seats
      FROM bus_seats 
      WHERE schedule_id = ?`,
      [schedule_id]
    );

    const stats = seatStats[0];
    const totalRevenue = (stats.booked_seats || 0) * (schedule.per_seat_rate || 0);

    // Create journey record
    await connection.query(
      `INSERT INTO journey_records (
        schedule_id, bus_manager_id, bus_number, route_from, route_to,
        journey_date, timing, total_seats, booked_seats, available_seats,
        total_revenue, per_seat_rate, status, notes
      ) VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [
        schedule_id,
        managerIdInt,
        schedule.bus_number,
        schedule.route_from,
        schedule.route_to,
        schedule.timing,
        stats.total_seats || 45,
        stats.booked_seats || 0,
        stats.available_seats || 45,
        totalRevenue,
        schedule.per_seat_rate || 0,
        notes || null
      ]
    );

    // Reset all seats to available
    await connection.query(
      `UPDATE bus_seats 
      SET status = 'available', booked_by = NULL 
      WHERE schedule_id = ?`,
      [schedule_id]
    );

    // Update schedule available_seats count
    await connection.query(
      'UPDATE bus_schedules SET available_seats = 45 WHERE id = ?',
      [schedule_id]
    );

    await connection.commit();

    console.log(`✅ Journey completed for schedule ${schedule_id}, ${stats.booked_seats} seats booked, Revenue: ${totalRevenue}`);

    res.json({
      success: true,
      message: 'Journey completed and seats reset successfully',
      journey: {
        schedule_id,
        booked_seats: stats.booked_seats || 0,
        total_revenue: totalRevenue,
        route: `${schedule.route_from} → ${schedule.route_to}`
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Complete journey error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to complete journey',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get journey records for a bus manager
exports.getJourneyRecords = async (req, res) => {
  try {
    const { bus_manager_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const [records] = await pool.query(
      `SELECT * FROM journey_records 
      WHERE bus_manager_id = ? 
      ORDER BY journey_date DESC, created_at DESC 
      LIMIT ? OFFSET ?`,
      [bus_manager_id, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM journey_records WHERE bus_manager_id = ?',
      [bus_manager_id]
    );

    res.json({
      success: true,
      records,
      total: countResult[0].total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Get journey records error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch journey records',
      error: error.message 
    });
  }
};

// Get journey statistics
exports.getJourneyStats = async (req, res) => {
  try {
    const { bus_manager_id } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_journeys,
        SUM(booked_seats) as total_booked_seats,
        SUM(total_revenue) as total_revenue,
        AVG(booked_seats) as avg_booked_seats,
        MAX(booked_seats) as max_booked_seats,
        MIN(booked_seats) as min_booked_seats
      FROM journey_records 
      WHERE bus_manager_id = ?
    `;

    const params = [bus_manager_id];

    if (start_date) {
      query += ' AND journey_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND journey_date <= ?';
      params.push(end_date);
    }

    const [stats] = await pool.query(query, params);

    res.json({
      success: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('❌ Get journey stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch journey statistics',
      error: error.message 
    });
  }
};

// Get bus manager statistics (formatted for mobile app)
exports.getBusManagerStatistics = async (req, res) => {
  try {
    const { bus_manager_id } = req.params;

    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN booked_seats ELSE 0 END), 0) as total_passengers,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_trips,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_revenue ELSE 0 END), 0) as total_revenue
      FROM journey_records 
      WHERE bus_manager_id = ?
    `;

    const [stats] = await pool.query(query, [bus_manager_id]);

    console.log('📊 Statistics for manager', bus_manager_id, ':', stats[0]);

    res.json({
      total_trips: parseInt(stats[0].total_trips) || 0,
      total_passengers: parseInt(stats[0].total_passengers) || 0,
      cancelled_trips: parseInt(stats[0].cancelled_trips) || 0,
      total_revenue: parseFloat(stats[0].total_revenue) || 0
    });

  } catch (error) {
    console.error('❌ Get bus manager statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics',
      error: error.message 
    });
  }
};

module.exports = {
  completeJourney: exports.completeJourney,
  getJourneyRecords: exports.getJourneyRecords,
  getJourneyStats: exports.getJourneyStats,
  getBusManagerStatistics: exports.getBusManagerStatistics
};
