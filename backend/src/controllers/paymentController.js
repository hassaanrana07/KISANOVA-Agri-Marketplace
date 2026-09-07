const paymentService = require('../services/paymentService');

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
    if (error.message === 'Order not found.') {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (error.message && error.message.includes('Access denied')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === 'Seller profile not found.') {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment receipt.'
    });
  }
};

/**
 * Get Payment Status for an Order (IDOR protected)
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await paymentService.getPaymentStatus(parseInt(orderId), req.user);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    return res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    if (error.message === 'Order not found.') {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (error.message && error.message.includes('Access denied')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message === 'Seller profile not found.') {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment status.'
    });
  }
};

module.exports = {
  getOrderReceipt,
  getPaymentStatus
};
