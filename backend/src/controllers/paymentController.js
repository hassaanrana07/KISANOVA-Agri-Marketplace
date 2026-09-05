const paymentService = require('../services/paymentService');
const pool = require('../config/db');

/**
 * Public Payment Configuration Status Check
 * Returns whether real provider credentials are active or running in Sandbox Simulation
 */
const getPaymentConfigStatus = async (req, res) => {
  try {
    const config = paymentService.getProviderConfigStatus();
    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve payment configuration.' });
  }
};

/**
 * Process and Verify Online Payment (Easypaisa, JazzCash, SadaPay)
 */
const verifyOnlinePayment = async (req, res) => {
  try {
    const { orderId, transactionReference, token, partialAmount } = req.body;

    if (!orderId || !transactionReference || !token) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, transaction reference, and verification token are required.'
      });
    }

    const result = await paymentService.verifyAndSettlePayment({
      orderId: parseInt(orderId),
      transactionReference,
      token,
      partialAmount: partialAmount ? parseFloat(partialAmount) : null
    });

    return res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Online payment verification error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Payment settlement failed.'
    });
  }
};

/**
 * Webhook Receiver for Payment Providers (Easypaisa, JazzCash, SadaPay)
 */
const handleProviderWebhook = async (req, res) => {
  try {
    const { provider } = req.params;
    const signature = req.headers['x-provider-signature'] || req.headers['x-signature'];

    const result = await paymentService.handleProviderWebhook(provider, req.body, signature);

    return res.json({
      success: true,
      message: `Webhook processed for ${provider}`,
      data: result
    });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Webhook processing failed.'
    });
  }
};

/**
 * Get Official Printable Payment Receipt
 */
const getOrderReceipt = async (req, res) => {
  try {
    const { orderId } = req.params;
    const receipt = await paymentService.getPaymentReceipt(parseInt(orderId), req.user);

    return res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to retrieve payment receipt.'
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
      `SELECT id, order_id, payment_provider, transaction_reference, amount, currency, 
              amount_paid, amount_remaining, status, payment_method, proof_url, admin_notes, created_at 
       FROM payments 
       WHERE order_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
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

/**
 * Seller Payout Controller Endpoints
 */
const getSellerPayoutHistory = async (req, res) => {
  try {
    const [sellers] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [req.user.id]);
    if (sellers.length === 0) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const data = await paymentService.getSellerPayouts(sellers[0].id);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const requestSellerPayout = async (req, res) => {
  try {
    const [sellers] = await pool.query('SELECT * FROM sellers WHERE user_id = ?', [req.user.id]);
    if (sellers.length === 0) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const seller = sellers[0];
    const { amount, payoutMethod, destination, notes } = req.body;

    const result = await paymentService.requestSellerPayout({
      sellerId: seller.id,
      amount: parseFloat(amount),
      payoutMethod: payoutMethod || seller.payout_method || 'BANK_TRANSFER',
      destination: destination || seller.payout_account_number,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Payout request registered successfully in PKR.',
      data: result
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPaymentConfigStatus,
  verifyOnlinePayment,
  handleProviderWebhook,
  getOrderReceipt,
  getPaymentStatus,
  getSellerPayoutHistory,
  requestSellerPayout
};
