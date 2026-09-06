const express = require('express');
const router = express.Router();
const {
  getPaymentStatus,
  getOrderReceipt
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

// Payment endpoints enforce authentication and IDOR checks individually
router.get('/status/:orderId', requireAuth, getPaymentStatus);
router.get('/receipt/:orderId', requireAuth, getOrderReceipt);
router.get('/:orderId/receipt', requireAuth, getOrderReceipt);

module.exports = router;
