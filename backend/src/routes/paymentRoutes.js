const express = require('express');
const router = express.Router();
const {
  getPaymentConfigStatus,
  verifyOnlinePayment,
  handleProviderWebhook,
  getPaymentStatus,
  getOrderReceipt,
  getSellerPayoutHistory,
  requestSellerPayout
} = require('../controllers/paymentController');
const { requireAuth, requireApprovedSeller } = require('../middleware/auth');

// Public route for payment configuration / sandbox mode check
router.get('/config-status', getPaymentConfigStatus);

// Provider Webhook callback (unauthenticated since provider calls this with signature)
router.post('/webhook/:provider', handleProviderWebhook);

// Protected routes (Buyer, Seller, Admin)
router.use(requireAuth);

router.post('/verify-online', verifyOnlinePayment);
router.post('/process-sandbox', verifyOnlinePayment);
router.get('/status/:orderId', getPaymentStatus);
router.get('/receipt/:orderId', getOrderReceipt);
router.get('/:orderId/receipt', getOrderReceipt);

// Seller Payout Routes
router.get('/seller/payouts', requireApprovedSeller, getSellerPayoutHistory);
router.post('/seller/payouts/request', requireApprovedSeller, requestSellerPayout);

module.exports = router;
