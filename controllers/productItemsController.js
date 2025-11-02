const db = require('../db/connection');
const { validationResult } = require('express-validator');
const { formatErrorResponse } = require('../utils/responseFormatter');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const util = require('util');
const unlinkAsync = util.promisify(fs.unlink);

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category_id } = req.query;
    
    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required' });
    }
    
    const [products] = await db.execute(`
      SELECT 
        p.id, 
        p.category_id, 
        p.name, 
        p.description, 
        p.price, 
        p.stock, 
        p.rating,
        p.created_at, 
        p.updated_at,
        pi.image_url,
        pi.is_primary
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.category_id = ? 
      ORDER BY p.name ASC
    `, [category_id]);
    
    res.status(200).json({ products });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
};

// Get all products with optional category filter
exports.getAllProducts = async (req, res) => {
  try {
    const { category_id } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    
    let query, params = [];
    
    // Base query to get products with their primary image
    const baseQuery = `
      SELECT p.*, 
             pc.name as category_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as primary_image,
             (SELECT COUNT(*) FROM product_ratings WHERE product_id = p.id) as ratings_count
      FROM products p
      LEFT JOIN products_categories pc ON p.category_id = pc.id
    `;
    
    // Add category filter if provided
    if (category_id) {
      query = `${baseQuery} WHERE p.category_id = ? ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      params = [parseInt(category_id)];
    } else {
      query = `${baseQuery} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      params = [];
    }
    
    const [products] = await db.execute(query, params);
    
    // Fetch all images for each product efficiently
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const placeholders = productIds.map(() => '?').join(',');
      const imagesQuery = `SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY is_primary DESC`;
      const [allImages] = await db.execute(imagesQuery, productIds);
      
      // Group images by product_id
      const imagesByProduct = {};
      allImages.forEach(img => {
        if (!imagesByProduct[img.product_id]) {
          imagesByProduct[img.product_id] = [];
        }
        imagesByProduct[img.product_id].push(img);
      });
      
      // Attach images to each product
      products.forEach(product => {
        product.images = imagesByProduct[product.id] || [];
      });
      
      console.log(' First product primary_image:', products[0].primary_image);
      console.log(' First product name:', products[0].name);
      console.log(` Fetched ${products.length} products with images`);
    }
    
    // Count total records for pagination
    let countQuery, countParams = [];
    
    if (category_id) {
      countQuery = 'SELECT COUNT(*) as total FROM products WHERE category_id = ?';
      countParams = [category_id];
    } else {
      countQuery = 'SELECT COUNT(*) as total FROM products';
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    res.status(200).json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get a single product by ID with its images and ratings
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get product details
    const productQuery = `
      SELECT p.*, pc.name as category_name
      FROM products p
      LEFT JOIN products_categories pc ON p.category_id = pc.id
      WHERE p.id = ?
    `;
    const [productResult] = await db.execute(productQuery, [id]);
    
    if (productResult.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = productResult[0];
    
    // Get product images
    const imagesQuery = 'SELECT * FROM product_images WHERE product_id = ?';
    const [images] = await db.execute(imagesQuery, [id]);
    
    // Get product ratings
    const ratingsQuery = `
      SELECT pr.*, u.name as user_name
      FROM product_ratings pr
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE pr.product_id = ?
      ORDER BY pr.created_at DESC
    `;
    const [ratings] = await db.execute(ratingsQuery, [id]);
    
    // Calculate average rating
    let avgRating = 0;
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = totalRating / ratings.length;
    }
    
    const productWithDetails = {
      ...product,
      images,
      ratings,
      average_rating: avgRating
    };
    
    res.status(200).json(productWithDetails);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatErrorResponse(errors));
    }
    
    const { category_id, name, description, price, stock } = req.body;
    
    // Validate category exists
    const [categoryCheck] = await connection.execute(
      'SELECT id FROM products_categories WHERE id = ?',
      [category_id]
    );
    
    if (categoryCheck.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // Create product
    const [productResult] = await connection.execute(
      'INSERT INTO products (category_id, name, description, price, stock) VALUES (?, ?, ?, ?, ?)',
      [category_id, name, description, price, stock || 0]
    );
    
    const productId = productResult.insertId;
    
    // Process image upload if provided
    let imageUploaded = false;
    if (req.file) {
      const imagePath = `/uploads/products/${req.file.filename}`;
      
      const [imageResult] = await connection.execute(
        'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
        [productId, imagePath, true]
      );
      
      imageUploaded = imageResult.affectedRows === 1;
    }
    
    await connection.commit();
    
    res.status(201).json({
      id: productId,
      category_id,
      name,
      description,
      price,
      stock: stock || 0,
      image_uploaded: imageUploaded,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    connection.release();
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatErrorResponse(errors));
    }
    
    const { id } = req.params;
    const { category_id, name, description, price, stock } = req.body;
    
    // Check if product exists
    const [productCheck] = await connection.execute(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );
    
    if (productCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Validate category exists if updating
    if (category_id) {
      const [categoryCheck] = await connection.execute(
        'SELECT id FROM products_categories WHERE id = ?',
        [category_id]
      );
      
      if (categoryCheck.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid category ID' });
      }
    }
    
    // Update product
    const [updateResult] = await connection.execute(
      'UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, stock = ? WHERE id = ?',
      [category_id, name, description, price, stock || 0, id]
    );
    
    // Process image upload if provided
    let imageUploaded = false;
    if (req.file) {
      const imagePath = `/uploads/products/${req.file.filename}`;
      
      // Check if there's already a primary image
      const [primaryImageCheck] = await connection.execute(
        'SELECT id, image_url FROM product_images WHERE product_id = ? AND is_primary = true',
        [id]
      );
      
      if (primaryImageCheck.length > 0) {
        // Update existing primary image
        await connection.execute(
          'UPDATE product_images SET image_url = ? WHERE id = ?',
          [imagePath, primaryImageCheck[0].id]
        );
        
        // Delete old image file if it exists
        const oldImagePath = path.join(__dirname, '..', primaryImageCheck[0].image_url);
        if (fs.existsSync(oldImagePath)) {
          await unlinkAsync(oldImagePath);
        }
      } else {
        // Create new primary image
        await connection.execute(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, true)',
          [id, imagePath]
        );
      }
      
      imageUploaded = true;
    }
    
    await connection.commit();
    
    res.status(200).json({
      id: parseInt(id),
      category_id,
      name,
      description,
      price,
      stock: stock || 0,
      image_uploaded: imageUploaded,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  } finally {
    connection.release();
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Check if product exists
    const [productCheck] = await connection.execute(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );
    
    if (productCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get product images to delete files
    const [images] = await connection.execute(
      'SELECT image_url FROM product_images WHERE product_id = ?',
      [id]
    );
    
    // Delete product images from filesystem
    for (const image of images) {
      const imagePath = path.join(__dirname, '..', image.image_url);
      if (fs.existsSync(imagePath)) {
        await unlinkAsync(imagePath);
      }
    }
    
    // Delete product (cascades to images and ratings)
    await connection.execute('DELETE FROM products WHERE id = ?', [id]);
    
    await connection.commit();
    
    res.status(200).json({
      message: 'Product deleted successfully',
      id: parseInt(id)
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  } finally {
    connection.release();
  }
};

// Add product image
exports.addProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_primary } = req.body;
    
    // Check if product exists
    const [productCheck] = await db.execute(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );
    
    if (productCheck.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const isPrimary = is_primary === 'true' || is_primary === true;
    const imagePath = `/uploads/products/${req.file.filename}`;
    
    // If setting as primary, update existing primary images
    if (isPrimary) {
      await db.execute(
        'UPDATE product_images SET is_primary = false WHERE product_id = ? AND is_primary = true',
        [id]
      );
    }
    
    // Add new image
    const [imageResult] = await db.execute(
      'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
      [id, imagePath, isPrimary]
    );
    
    res.status(201).json({
      id: imageResult.insertId,
      product_id: parseInt(id),
      image_url: imagePath,
      is_primary: isPrimary,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error adding product image:', error);
    res.status(500).json({ error: 'Failed to add product image' });
  }
};

// Delete product image
exports.deleteProductImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    
    // Check if image exists and belongs to product
    const [imageCheck] = await db.execute(
      'SELECT * FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, id]
    );
    
    if (imageCheck.length === 0) {
      return res.status(404).json({ error: 'Image not found or does not belong to this product' });
    }
    
    const imageData = imageCheck[0];
    
    // Delete image file
    const imagePath = path.join(__dirname, '..', imageData.image_url);
    if (fs.existsSync(imagePath)) {
      await unlinkAsync(imagePath);
    }
    
    // Delete image record
    await db.execute('DELETE FROM product_images WHERE id = ?', [imageId]);
    
    // If deleted image was primary, set another image as primary if available
    if (imageData.is_primary) {
      const [otherImages] = await db.execute(
        'SELECT id FROM product_images WHERE product_id = ? LIMIT 1',
        [id]
      );
      
      if (otherImages.length > 0) {
        await db.execute(
          'UPDATE product_images SET is_primary = true WHERE id = ?',
          [otherImages[0].id]
        );
      }
    }
    
    res.status(200).json({
      message: 'Product image deleted successfully',
      id: parseInt(imageId)
    });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ error: 'Failed to delete product image' });
  }
};

// Set primary product image
exports.setPrimaryImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    
    // Check if image exists and belongs to product
    const [imageCheck] = await db.execute(
      'SELECT * FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, id]
    );
    
    if (imageCheck.length === 0) {
      return res.status(404).json({ error: 'Image not found or does not belong to this product' });
    }
    
    // Update all product images to not be primary
    await db.execute(
      'UPDATE product_images SET is_primary = false WHERE product_id = ?',
      [id]
    );
    
    // Set selected image as primary
    await db.execute(
      'UPDATE product_images SET is_primary = true WHERE id = ?',
      [imageId]
    );
    
    res.status(200).json({
      message: 'Primary image updated successfully',
      product_id: parseInt(id),
      image_id: parseInt(imageId)
    });
  } catch (error) {
    console.error('Error setting primary image:', error);
    res.status(500).json({ error: 'Failed to set primary image' });
  }
};

// Add/Update product rating
exports.rateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatErrorResponse(errors));
    }
    
    const { id } = req.params;
    const { user_id, rating, review } = req.body;
    
    // Check if product exists
    const [productCheck] = await db.execute(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );
    
    if (productCheck.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if user exists
    const [userCheck] = await db.execute(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );
    
    if (userCheck.length === 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if user already rated this product
    const [existingRating] = await db.execute(
      'SELECT id FROM product_ratings WHERE product_id = ? AND user_id = ?',
      [id, user_id]
    );
    
    let ratingId;
    
    if (existingRating.length > 0) {
      // Update existing rating
      await db.execute(
        'UPDATE product_ratings SET rating = ?, review = ? WHERE id = ?',
        [rating, review, existingRating[0].id]
      );
      ratingId = existingRating[0].id;
    } else {
      // Create new rating
      const [ratingResult] = await db.execute(
        'INSERT INTO product_ratings (product_id, user_id, rating, review) VALUES (?, ?, ?, ?)',
        [id, user_id, rating, review]
      );
      ratingId = ratingResult.insertId;
    }
    
    // Update average rating in products table
    const [ratingsData] = await db.execute(
      'SELECT AVG(rating) as avg_rating FROM product_ratings WHERE product_id = ?',
      [id]
    );
    
    const avgRating = ratingsData[0].avg_rating;
    
    await db.execute(
      'UPDATE products SET rating = ? WHERE id = ?',
      [avgRating, id]
    );
    
    res.status(200).json({
      id: ratingId,
      product_id: parseInt(id),
      user_id: parseInt(user_id),
      rating: parseInt(rating),
      review,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error rating product:', error);
    res.status(500).json({ error: 'Failed to rate product' });
  }
};

// Delete product rating
exports.deleteRating = async (req, res) => {
  try {
    const { id, ratingId } = req.params;
    
    // Check if rating exists and belongs to product
    const [ratingCheck] = await db.execute(
      'SELECT * FROM product_ratings WHERE id = ? AND product_id = ?',
      [ratingId, id]
    );
    
    if (ratingCheck.length === 0) {
      return res.status(404).json({ error: 'Rating not found or does not belong to this product' });
    }
    
    // Delete rating
    await db.execute('DELETE FROM product_ratings WHERE id = ?', [ratingId]);
    
    // Update average rating in products table
    const [ratingsData] = await db.execute(
      'SELECT AVG(rating) as avg_rating FROM product_ratings WHERE product_id = ?',
      [id]
    );
    
    const avgRating = ratingsData[0].avg_rating || 0;
    
    await db.execute(
      'UPDATE products SET rating = ? WHERE id = ?',
      [avgRating, id]
    );
    
    res.status(200).json({
      message: 'Rating deleted successfully',
      id: parseInt(ratingId)
    });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ error: 'Failed to delete rating' });
  }
}; console.log("test")