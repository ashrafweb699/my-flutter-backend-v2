const router = require('express').Router();
const cartCtrl = require('../controllers/cartController');

// Cart routes
router.post('/cart/add', cartCtrl.addToCart);
router.get('/cart/user/:userId', cartCtrl.getUserCart);
router.post('/cart/remove', cartCtrl.removeFromCart);
router.delete('/cart/user/:userId', cartCtrl.clearCart);

module.exports = router;
