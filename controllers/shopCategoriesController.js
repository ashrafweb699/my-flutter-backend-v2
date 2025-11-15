const pool = require('../db/db');

// Get all shop categories
exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await pool.query('SELECT * FROM shop_categories ORDER BY category_name ASC');
    res.json({
      success: true,
      data: categories,
      message: 'Categories fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [category] = await pool.query('SELECT * FROM shop_categories WHERE id = ?', [id]);
    
    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      data: category[0],
      message: 'Category fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;
    
    if (!category_name || category_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Check if category already exists
    const [existing] = await pool.query('SELECT id FROM shop_categories WHERE category_name = ?', [category_name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }
    
    const [result] = await pool.query('INSERT INTO shop_categories (category_name) VALUES (?)', [category_name]);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        category_name: category_name
      },
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;
    
    if (!category_name || category_name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Check if category exists
    const [existing] = await pool.query('SELECT id FROM shop_categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if new name already exists (excluding current category)
    const [duplicate] = await pool.query('SELECT id FROM shop_categories WHERE category_name = ? AND id != ?', [category_name, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    
    await pool.query('UPDATE shop_categories SET category_name = ? WHERE id = ?', [category_name, id]);
    
    res.json({
      success: true,
      data: {
        id: parseInt(id),
        category_name: category_name
      },
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const [existing] = await pool.query('SELECT id FROM shop_categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    await pool.query('DELETE FROM shop_categories WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};
