const express = require('express');
const router = express.Router();
const gateway = require('../controllers/gatewayController');

// Fetch pending OTP messages for gateway device
router.get('/outbox', gateway.fetchOutbox);

// Update status of an outbox item (sent/delivered/failed)
router.post('/outbox/:id/status', gateway.updateOutboxStatus);

// Ingest incoming payment SMS parsed by the Android gateway
router.post('/incoming-sms', gateway.ingestIncomingSMS);

module.exports = router;
