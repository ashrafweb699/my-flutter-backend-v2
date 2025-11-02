const { pool } = require('../config/db');

// Create product sub-item
exports.create = async (req, res) => {
  try {
    const { category_id, sub_item_name, description, image_url, price, unit, min_quantity } = req.body;
    if (!category_id || !sub_item_name || !unit) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const [r] = await pool.query(
      `INSERT INTO products_items (category_id, sub_item_name, description, image_url, price, unit, min_quantity)
       VALUES (?,?,?,?,?,?,?)`,
      [category_id, sub_item_name, description || '', image_url || '', price || 0, unit, min_quantity || 1]
    );
    return res.json({ id: r.insertId });
  } catch (e) {
    console.error('productItems.create error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// List product sub-items (optional filter by category_id)
exports.list = async (req, res) => {
  try {
    const { category_id } = req.query;
    const q = category_id
      ? `SELECT * FROM products_items WHERE category_id = ? ORDER BY id DESC`
      : `SELECT * FROM products_items ORDER BY id DESC`;
    const params = category_id ? [category_id] : [];
    const [rows] = await pool.query(q, params);
    return res.json({ items: rows });
  } catch (e) {
    console.error('productItems.list error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get single product sub-item
exports.getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM products_items WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('productItems.getOne error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update product sub-item
exports.update = async (req, res) => {
  try {
    const { category_id, sub_item_name, description, image_url, price, unit, min_quantity } = req.body;
    await pool.query(
      `UPDATE products_items SET category_id=?, sub_item_name=?, description=?, image_url=?, price=?, unit=?, min_quantity=? WHERE id=?`,
      [category_id || null, sub_item_name, description || '', image_url || '', price || 0, unit, min_quantity || 1, req.params.id]
    );
    return res.json({ updated: true });
  } catch (e) {
    console.error('productItems.update error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete product sub-item
exports.remove = async (req, res) => {
  try {
    await pool.query(`DELETE FROM products_items WHERE id = ?`, [req.params.id]);
    return res.json({ deleted: true });
  } catch (e) {
    console.error('productItems.remove error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};
