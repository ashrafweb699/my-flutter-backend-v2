const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Get all drivers
router.get('/drivers', async (req, res) => {
  try {
    const [drivers] = await pool.query(`
      SELECT u.id, u.name, u.email, d.vehicle_number, d.mobile_number, d.profile_image
      FROM users u
      LEFT JOIN drivers d ON u.id = d.user_id
      WHERE u.user_type = 'driver'
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get all delivery boys
router.get('/delivery-boys', async (req, res) => {
  try {
    const [deliveryBoys] = await pool.query(`
      SELECT u.id, u.name, u.email, db.mobile_number, db.full_name, db.cnic_front_image
      FROM users u
      LEFT JOIN delivery_boys db ON u.id = db.user_id
      WHERE u.user_type = 'd_boy'
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    res.json(deliveryBoys);
  } catch (error) {
    console.error('Error fetching delivery boys:', error);
    res.status(500).json({ error: 'Failed to fetch delivery boys' });
  }
});

// Get all bus managers
router.get('/bus-managers', async (req, res) => {
  try {
    const [busManagers] = await pool.query(`
      SELECT u.id, u.name, u.email, bm.phone, bm.cnic, bm.transport_name
      FROM users u
      LEFT JOIN bus_managers bm ON u.id = bm.user_id
      WHERE u.user_type = 'bus_manager'
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    res.json(busManagers);
  } catch (error) {
    console.error('Error fetching bus managers:', error);
    res.status(500).json({ error: 'Failed to fetch bus managers' });
  }
});

// Get all shopkeepers
router.get('/shopkeepers', async (req, res) => {
  try {
    const [shopkeepers] = await pool.query(`
      SELECT id, name, email, created_at
      FROM users
      WHERE user_type = 'shopkeeper'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    res.json(shopkeepers);
  } catch (error) {
    console.error('Error fetching shopkeepers:', error);
    res.status(500).json({ error: 'Failed to fetch shopkeepers' });
  }
});

module.exports = router;
