const router = require('express').Router();
const ordersCtrl = require('../controllers/ordersController');

module.exports = (io) => {
  router.post('/order', ordersCtrl.create(io));
  router.get('/admin/orders', /*auth.adminAuth,*/ ordersCtrl.listAll);
  router.get('/orders/user/:userId', ordersCtrl.listByUser);
  router.put('/admin/orders/:id/status', ordersCtrl.updateStatus(io));
  return router;
};


