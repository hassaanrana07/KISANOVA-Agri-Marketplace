const paymentService = require('../services/paymentService');
const pool = require('../config/db');
const { uploadMedia } = require('../services/storageService');

/**
 * Process Digital Card / Sandbox Payment Settlement
 */
const processSandboxPayment = async (req, res) => {
  try {
    const { orderId, transactionReference, token, cardLast4 } = req.body;

    if (!orderId || !transactionReference || !token) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, transaction reference, and security token are required.'
      });
    }

    const result = await paymentService.verifyAndSettlePayment({
      orderId: parseInt(orderId),
      transactionReference,
      token,
      cardLast4: cardLast4 || '4242'
    });

    return res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Payment settlement error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Payment settlement failed.'
    });
  }
};

/**
 * Submit Bank Transfer Reference & Receipt Proof
 */
const submitBankTransfer = async (req, res) => {
  try {
    const { orderId, transactionReference, notes } = req.body;
    let proofUrl = null;

    if (req.file) {
      const uploaded = await uploadMedia(req.file.path, {
        resource_type: 'image',
        folder: 'kisanova_receipts'
      });
      proofUrl = uploaded.url;
    }

    const result = await paymentService.submitBankTransferProof({
      orderId: parseInt(orderId),
      transactionReference,
      proofUrl,
      notes
    });

    return res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Bank transfer submission error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit bank transfer.'
    });
  }
};

/**
 * Get Payment Status for an Order
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const [payments] = await pool.query(
      'SELECT id, order_id, payment_provider, transaction_reference, amount, currency, status, payment_method, proof_url, admin_notes, created_at FROM payments WHERE order_id = ?',
      [orderId]
    );

    if (payments.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    return res.json({
      success: true,
      data: payments[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve payment status.' });
  }
};

module.exports = {
  processSandboxPayment,
  submitBankTransfer,
  getPaymentStatus
};
