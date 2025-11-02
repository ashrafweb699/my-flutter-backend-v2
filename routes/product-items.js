const router = require('express').Router();
const ctrl = require('../controllers/productItemsController');
// const auth = require('../middleware/auth');

// Admin CRUD (auth can be enabled when ready)
router.post('/admin/product-items', /*auth.adminAuth,*/ ctrl.create);
router.get('/product-items', ctrl.list);
router.get('/product-items/:id', ctrl.getOne);
router.put('/admin/product-items/:id', /*auth.adminAuth,*/ ctrl.update);
router.delete('/admin/product-items/:id', /*auth.adminAuth,*/ ctrl.remove);

module.exports = router;
