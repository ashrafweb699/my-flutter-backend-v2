const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const upload = require('../utils/upload');

// GET all categories
router.get('/', categoriesController.getAllCategories);

// GET a single category by ID
router.get('/:id', categoriesController.getCategoryById);

// POST create a new category with optional image upload
router.post('/', upload.single('image'), categoriesController.createCategory);

// PUT update a category with optional image upload
router.put('/:id', upload.single('image'), categoriesController.updateCategory);

// DELETE a category (soft delete)
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router; 