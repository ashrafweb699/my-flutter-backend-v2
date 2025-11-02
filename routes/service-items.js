const router = require('express').Router();
const ctrl = require('../controllers/serviceItemsController');
// const auth = require('../middleware/auth');

router.post('/admin/service-items', /*auth.adminAuth,*/ ctrl.create);
router.get('/service-items', ctrl.list);
router.get('/service-items/:id', ctrl.getOne);
router.put('/admin/service-items/:id', /*auth.adminAuth,*/ ctrl.update);
router.delete('/admin/service-items/:id', /*auth.adminAuth,*/ ctrl.remove);

module.exports = router;


