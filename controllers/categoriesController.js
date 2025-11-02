const { pool } = require('../config/db');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, image_url FROM products_categories ORDER BY name ASC
    `);

    const categories = rows.map(row => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url || '',
    }));

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};


// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, image_url FROM products_categories WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = rows[0];
    res.json({
      id: category.id,
      name: category.name,
      imageUrl: category.image_url || '',
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};


// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, imageUrl } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO products_categories (name, image_url) VALUES (?, ?)`,
      [name, imageUrl || null]
    );

    res.status(201).json({ id: result.insertId, name, imageUrl: imageUrl || '' });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};


// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { name, imageUrl } = req.body;
    const categoryId = req.params.id;

    // Check if the category exists
    const [checkRows] = await pool.query(
      'SELECT id, name, image_url FROM products_categories WHERE id = ?',
      [categoryId]
    );
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const existingCategory = checkRows[0];

    // Update the category
    await pool.query(
      `UPDATE products_categories SET name = ?, image_url = ? WHERE id = ?`,
      [name || existingCategory.name, imageUrl ?? existingCategory.image_url, categoryId]
    );

    res.json({ id: categoryId, name: name || existingCategory.name, imageUrl: imageUrl ?? existingCategory.image_url });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if the category exists
    const [checkRows] = await pool.query('SELECT id FROM products_categories WHERE id = ?', [categoryId]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Hard delete for simplicity (no FK constraints assumed here)
    await pool.query('DELETE FROM products_categories WHERE id = ?', [categoryId]);

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};