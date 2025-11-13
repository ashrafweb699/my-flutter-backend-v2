const router = require('express').Router();
const ctrl = require('../controllers/walletController');

router.get('/:userId', ctrl.getUserBalance);
router.post('/:userId/reset', ctrl.resetUserBalance);
router.post('/:userId/credit', ctrl.creditForTest);

module.exports = router;
