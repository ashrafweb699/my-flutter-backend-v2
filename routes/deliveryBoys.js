const express = require('express');
const router = express.Router();
const deliveryBoysController = require('../controllers/deliveryBoysController');

router.get('/', deliveryBoysController.getAll);
router.post('/', deliveryBoysController.register);
router.patch('/:id/approval', deliveryBoysController.updateApproval);
router.post('/login', deliveryBoysController.login);
router.get('/check-email', deliveryBoysController.checkEmail);
router.get('/by-user/:userId', deliveryBoysController.getByUser);

module.exports = router;


