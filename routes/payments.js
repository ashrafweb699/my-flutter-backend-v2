const express = require('express');
const router = express.Router();
const payments = require('../controllers/paymentsController');

// User submits TID after manual wallet transfer
router.post('/manual-tid', payments.submitManualTID);

// Check TID status
router.get('/tid/:tid/status', payments.checkTIDStatus);

module.exports = router;
