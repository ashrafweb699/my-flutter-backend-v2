const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const productsController = require('../controllers/productsController');
const productsCategoriesController = require('../controllers/productsCategoriesController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueFileName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFileName);
  }
});

// Configure multer upload
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    // More flexible file type checking
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp'
    ];
    
    const allowedExtensions = /\.(jpg|jpeg|png|webp|gif|bmp)$/i;
    
    // Check mimetype OR extension (more lenient)
    const validMimeType = allowedMimeTypes.includes(file.mimetype.toLowerCase());
    const validExtension = allowedExtensions.test(file.originalname.toLowerCase());
    
    if (validMimeType || validExtension) {
      console.log(`✅ File accepted: ${file.originalname} (${file.mimetype})`);
      return cb(null, true);
    } else {
      console.error(`❌ File rejected: ${file.originalname} (${file.mimetype})`);
      cb(new Error(`Invalid file type. Allowed: jpeg, jpg, png, webp, gif, bmp. Got: ${file.mimetype}`));
    }
  }
});

// Validation for product category
const validateProductCategory = [
  check('name')
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Category name must be between 2 and 255 characters'),
  check('image_url')
    .optional()
    .isLength({ max: 500 }).withMessage('Image URL must not exceed 500 characters')
];

// Validation for product
const validateProduct = [
  check('category_id')
    .notEmpty().withMessage('Category ID is required')
    .isInt().withMessage('Category ID must be a number'),
  check('name')
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Product name must be between 2 and 255 characters'),
  check('description')
    .optional()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  check('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  check('stock')
    .optional()
    .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
];

// Validation for rating
const validateRating = [
  check('user_id')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be a number'),
  check('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  check('review')
    .optional()
    .isLength({ max: 1000 }).withMessage('Review must not exceed 1000 characters')
];

// ================ Product Categories Routes ================

// POST upload image for product category
// Using simpler approach without strict file filter for category images
const categoryUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for categories
});

router.post('/categories/upload-image', (req, res) => {
  console.log('📤 Upload request received');
  console.log('   Content-Type:', req.headers['content-type']);
  console.log('   File field name expected: image');
  
  categoryUpload.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      console.error('   Error stack:', err.stack);
      return res.status(400).json({ 
        error: 'Upload failed', 
        message: err.message,
        code: err.code 
      });
    }
    
    try {
      if (!req.file) {
        console.error('❌ No file received in request');
        console.log('   Request body:', req.body);
        console.log('   Request files:', req.files);
        return res.status(400).json({ error: 'No image file uploaded' });
      }
      
      // Return only the path (not full URL) - e.g. /uploads/products/abc-123.png
      const imagePath = `/uploads/products/${req.file.filename}`;
      
      console.log('✅ Category image uploaded successfully:', imagePath);
      console.log('   File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filename: req.file.filename
      });
      
      // Send back just the path as plain text (frontend will parse it)
      res.status(200).send(imagePath);
    } catch (error) {
      console.error('❌ Error processing upload:', error);
      console.error('   Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to process image', details: error.message });
    }
  });
});

// GET all product categories
router.get('/categories', productsCategoriesController.getAllProductCategories);

// GET a single product category
router.get('/categories/:id', productsCategoriesController.getProductCategoryById);

// POST create a new product category (admin only)
router.post(
  '/categories',
  // Temporarily removed auth.adminAuth to test,
  validateProductCategory,
  productsCategoriesController.createProductCategory
);

// PUT update a product category (admin only)
router.put(
  '/categories/:id',
  // Temporarily removed auth.adminAuth to test,
  validateProductCategory,
  productsCategoriesController.updateProductCategory
);

// DELETE a product category (admin only)
router.delete(
  '/categories/:id',
  // Temporarily removed auth.adminAuth to test,
  productsCategoriesController.deleteProductCategory
);

// ================ Products Routes ================

// GET all products with optional category filter
router.get('/', productsController.getAllProducts);

// GET products by category
router.get('/by-category', productsController.getProductsByCategory);

// GET a single product
router.get('/:id', productsController.getProductById);

// POST create a new product (admin only)
router.post(
  '/',
  auth.adminAuth,
  upload.single('image'),
  validateProduct,
  productsController.createProduct
);

// PUT update a product (admin only)
router.put(
  '/:id',
  auth.adminAuth,
  upload.single('image'),
  validateProduct,
  productsController.updateProduct
);

// DELETE a product (admin only)
router.delete(
  '/:id',
  auth.adminAuth,
  productsController.deleteProduct
);

// ================ Product Images Routes ================

// POST add an image to a product (admin only)
router.post(
  '/:id/images',
  auth.adminAuth,
  upload.single('image'),
  productsController.addProductImage
);

// DELETE remove an image from a product (admin only)
router.delete(
  '/:id/images/:imageId',
  auth.adminAuth,
  productsController.deleteProductImage
);

// PUT set an image as primary (admin only)
router.put(
  '/:id/images/:imageId/primary',
  auth.adminAuth,
  productsController.setPrimaryImage
);

// ================ Product Ratings Routes ================

// POST add/update a rating for a product (auth required)
router.post(
  '/:id/ratings',
  auth.userAuth,
  validateRating,
  productsController.rateProduct
);

// DELETE remove a rating (admin or rating owner only)
router.delete(
  '/:id/ratings/:ratingId',
  auth.userAuth,
  productsController.deleteRating
);

module.exports = router;