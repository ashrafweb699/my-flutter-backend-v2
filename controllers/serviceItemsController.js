const { pool } = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { service_name, sub_item_name, description, image_url, price, unit, min_quantity } = req.body;
    if (!service_name || !sub_item_name || !unit) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const [r] = await pool.query(
      `INSERT INTO service_items (service_name, sub_item_name, description, image_url, price, unit, min_quantity)
       VALUES (?,?,?,?,?,?,?)`,
      [service_name, sub_item_name, description || '', image_url || '', price || 0, unit, min_quantity || 1]
    );
    res.json({ id: r.insertId });
  } catch (e) {
    console.error('serviceItems.create error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.list = async (req, res) => {
  try {
    const { service_name } = req.query;
    const q = service_name
      ? `SELECT * FROM service_items WHERE service_name = ? ORDER BY id DESC`
      : `SELECT * FROM service_items ORDER BY id DESC`;
    const params = service_name ? [service_name] : [];
    const [rows] = await pool.query(q, params);
    res.json({ items: rows });
  } catch (e) {
    console.error('serviceItems.list error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM service_items WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('serviceItems.getOne error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const { service_name, sub_item_name, description, image_url, price, unit, min_quantity } = req.body;
    await pool.query(
      `UPDATE service_items SET service_name=?, sub_item_name=?, description=?, image_url=?, price=?, unit=?, min_quantity=? WHERE id=?`,
      [service_name, sub_item_name, description || '', image_url || '', price || 0, unit, min_quantity || 1, req.params.id]
    );
    res.json({ updated: true });
  } catch (e) {
    console.error('serviceItems.update error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    await pool.query(`DELETE FROM service_items WHERE id = ?`, [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    console.error('serviceItems.remove error', e);
    res.status(500).json({ message: 'Server error' });
  }
};


