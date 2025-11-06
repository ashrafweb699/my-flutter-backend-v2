const router = require('express').Router();
const ctrl = require('../controllers/serviceItemsController');
const upload = require('../utils/upload');
// const auth = require('../middleware/auth');

router.post('/admin/service-items', /*auth.adminAuth,*/ upload.single('image'), ctrl.create);
router.get('/service-items', ctrl.list);
router.get('/service-items/:id', ctrl.getOne);
router.put('/admin/service-items/:id', /*auth.adminAuth,*/ upload.single('image'), ctrl.update);
router.delete('/admin/service-items/:id', /*auth.adminAuth,*/ ctrl.remove);

module.exports = router;


