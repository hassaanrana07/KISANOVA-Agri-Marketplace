const express = require('express');
const router = express.Router();
const {
  processSandboxPayment,
  submitBankTransfer,
  getPaymentStatus
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth);

router.post('/process-sandbox', processSandboxPayment);
router.post('/bank-transfer', upload.single('receipt'), submitBankTransfer);
router.get('/status/:orderId', getPaymentStatus);

module.exports = router;
