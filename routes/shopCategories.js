const express = require('express');
const router = express.Router();
const shopCategoriesController = require('../controllers/shopCategoriesController');

// Get all categories
router.get('/', shopCategoriesController.getAllCategories);

// Get single category
router.get('/:id', shopCategoriesController.getCategoryById);

// Create category
router.post('/', shopCategoriesController.createCategory);

// Update category
router.put('/:id', shopCategoriesController.updateCategory);

// Delete category
router.delete('/:id', shopCategoriesController.deleteCategory);

module.exports = router;
