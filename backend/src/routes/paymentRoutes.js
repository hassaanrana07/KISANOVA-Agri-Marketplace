const express = require('express');
const router = express.Router();
const {
  getPaymentStatus,
  getOrderReceipt
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

// All payment endpoints require authentication and enforce IDOR checks
router.use(requireAuth);

router.get('/status/:orderId', getPaymentStatus);
router.get('/receipt/:orderId', getOrderReceipt);
router.get('/:orderId/receipt', getOrderReceipt);

module.exports = router;
