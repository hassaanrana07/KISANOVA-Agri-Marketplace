const express = require('express');
const router = express.Router();
const {
  getPaymentStatus,
  getOrderReceipt
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const { orderIdParamSchema } = require('../validators/paymentSchemas');

// Payment endpoints enforce authentication and IDOR checks
router.use(requireAuth);
router.use(authenticatedLimiter);

router.get('/status/:orderId', validate({ params: orderIdParamSchema }), getPaymentStatus);
router.get('/receipt/:orderId', validate({ params: orderIdParamSchema }), getOrderReceipt);
router.get('/:orderId/receipt', validate({ params: orderIdParamSchema }), getOrderReceipt);

module.exports = router;
