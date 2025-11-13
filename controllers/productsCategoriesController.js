const db = require('../db/connection');
const { validationResult } = require('express-validator');
const { formatErrorResponse } = require('../utils/responseFormatter');

// Get all product categories
exports.getAllProductCategories = async (req, res) => {
  try {
    const query = 'SELECT * FROM products_categories ORDER BY name ASC';
    const [categories] = await db.execute(query);
    
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: 'Failed to fetch product categories' });
  }
};

// Get a single product category by ID
exports.getProductCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM products_categories WHERE id = ?';
    const [category] = await db.execute(query, [id]);
    
    if (category.length === 0) {
      return res.status(404).json({ error: 'Product category not found' });
    }
    
    res.status(200).json(category[0]);
  } catch (error) {
    console.error('Error fetching product category:', error);
    res.status(500).json({ error: 'Failed to fetch product category' });
  }
};

// Create a new product category
exports.createProductCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatErrorResponse(errors));
    }
    
    let { name, image_url } = req.body;
    // Ensure undefined is not passed to the driver
    if (typeof image_url === 'undefined') image_url = null;
    const query = 'INSERT INTO products_categories (name, image_url) VALUES (?, ?)';
    const [result] = await db.execute(query, [name, image_url]);
    
    if (result.affectedRows === 1) {
      const newCategory = {
        id: result.insertId,
        name,
        image_url,
        created_at: new Date().toISOString()
      };
      
      res.status(201).json(newCategory);
    } else {
      throw new Error('Failed to create product category');
    }
  } catch (error) {
    console.error('Error creating product category:', error);
    res.status(500).json({ error: 'Failed to create product category' });
  }
};

// Update a product category
exports.updateProductCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatErrorResponse(errors));
    }
    
    const { id } = req.params;
    let { name, image_url } = req.body;
    
    // Check if category exists
    const checkQuery = 'SELECT * FROM products_categories WHERE id = ?';
    const [existingCategory] = await db.execute(checkQuery, [id]);
    
    if (existingCategory.length === 0) {
      return res.status(404).json({ error: 'Product category not found' });
    }
    
    // Fallback to existing values if fields are not provided; convert undefined to null
    const nameFinal = (typeof name === 'undefined') ? existingCategory[0].name : name;
    const imageUrlFinal = (typeof image_url === 'undefined') ? existingCategory[0].image_url : image_url;
    const updateQuery = 'UPDATE products_categories SET name = ?, image_url = ? WHERE id = ?';
    const [result] = await db.execute(updateQuery, [nameFinal, imageUrlFinal, id]);
    
    if (result.affectedRows === 1) {
      const updatedCategory = {
        id: parseInt(id),
        name: nameFinal,
        image_url: imageUrlFinal,
        updated_at: new Date().toISOString()
      };
      
      res.status(200).json(updatedCategory);
    } else {
      throw new Error('Failed to update product category');
    }
  } catch (error) {
    console.error('Error updating product category:', error);
    res.status(500).json({ error: 'Failed to update product category' });
  }
};

// Delete a product category
exports.deleteProductCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category exists
    const checkQuery = 'SELECT * FROM products_categories WHERE id = ?';
    const [existingCategory] = await db.execute(checkQuery, [id]);
    
    if (existingCategory.length === 0) {
      return res.status(404).json({ error: 'Product category not found' });
    }
    
    // Check if category has associated products
    const productsQuery = 'SELECT COUNT(*) as count FROM products WHERE category_id = ?';
    const [productsResult] = await db.execute(productsQuery, [id]);
    
    if (productsResult[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category because it has associated products',
        products_count: productsResult[0].count
      });
    }
    
    const deleteQuery = 'DELETE FROM products_categories WHERE id = ?';
    const [result] = await db.execute(deleteQuery, [id]);
    
    if (result.affectedRows === 1) {
      res.status(200).json({ 
        message: 'Product category deleted successfully',
        id: parseInt(id)
      });
    } else {
      throw new Error('Failed to delete product category');
    }
  } catch (error) {
    console.error('Error deleting product category:', error);
    res.status(500).json({ error: 'Failed to delete product category' });
  }
};
