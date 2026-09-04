const crypto = require('crypto');
const pool = require('../config/db');

/**
 * Payment Service Abstraction
 * Handles online card/provider gateway sessions, verification, and manual bank transfers
 */
class PaymentService {
  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER || 'kisanova_sandbox';
    this.apiKey = process.env.PAYMENT_API_KEY || 'test_sk_kisanova_sandbox_key';
    this.secret = process.env.PAYMENT_SECRET || 'test_whsec_kisanova_secret';
    this.currency = 'USD';
  }

  /**
   * Initialize a payment session for an order
   * @param {object} params { orderId, amount, buyerEmail, buyerName, paymentMethod }
   */
  async createPaymentSession({ orderId, amount, buyerEmail, buyerName, paymentMethod = 'card' }) {
    if (paymentMethod === 'bank_transfer') {
      // Manual Bank Transfer / IBAN flow
      const reference = `IBAN-WIRE-${Math.floor(100000 + Math.random() * 900000)}`;

      // Insert or update payment record as PENDING
      const [result] = await pool.query(
        `INSERT INTO payments (order_id, payment_provider, transaction_reference, amount, currency, status, payment_method)
         VALUES (?, 'bank_transfer', ?, ?, ?, 'PENDING', 'bank_transfer')`,
        [orderId, reference, amount, this.currency]
      );

      return {
        paymentId: result.insertId,
        provider: 'bank_transfer',
        transactionReference: reference,
        status: 'PENDING',
        bankDetails: {
          accountName: process.env.BANK_ACCOUNT_NAME || 'Kisanova Agricultural Escrow LLC',
          iban: process.env.BANK_IBAN || 'PK36MEZN0001234567890123',
          swift: process.env.BANK_SWIFT || 'MEZNPKKA',
          bankName: 'Meezan Islamic Agricultural Bank'
        },
        instruction: 'Please transfer the total amount to the IBAN account and submit your transfer reference for Admin verification.'
      };
    }

    // Digital Gateway / Sandbox Provider flow
    const transactionReference = `TXN-${this.provider.toUpperCase()}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [result] = await pool.query(
      `INSERT INTO payments (order_id, payment_provider, transaction_reference, amount, currency, status, payment_method)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
      [orderId, this.provider, transactionReference, amount, this.currency, paymentMethod]
    );

    const formattedAmount = parseFloat(amount).toFixed(2);

    // Create secure signature for verification
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${orderId}:${formattedAmount}:${transactionReference}`)
      .digest('hex');

    return {
      paymentId: result.insertId,
      provider: this.provider,
      transactionReference,
      amount,
      currency: this.currency,
      status: 'PENDING',
      verificationToken: signature,
      gatewayUrl: `/payment/gateway?ref=${transactionReference}&token=${signature}`
    };
  }

  /**
   * Verify and process a digital card/sandbox payment
   * Strictly verifies backend secret signature and provider transaction reference
   */
  async verifyAndSettlePayment({ orderId, transactionReference, token, cardLast4 = '4242' }) {
    // 1. Fetch payment record
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? AND transaction_reference = ?',
      [orderId, transactionReference]
    );

    if (payments.length === 0) {
      throw new Error('Payment record not found for transaction reference.');
    }

    const payment = payments[0];
    if (payment.status === 'PAID') {
      return { success: true, message: 'Payment is already settled.', payment };
    }

    const formattedAmount = parseFloat(payment.amount).toFixed(2);
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${orderId}:${formattedAmount}:${transactionReference}`)
      .digest('hex');

    if (token !== expectedSignature) {
      // Mark payment failed if token is tampered
      await pool.query(
        'UPDATE payments SET status = "FAILED", admin_notes = "Signature verification mismatch" WHERE id = ?',
        [payment.id]
      );
      throw new Error('Security verification failed. Invalid transaction token.');
    }

    // 3. Mark payment as PAID in transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        'UPDATE payments SET status = "PAID", updated_at = NOW() WHERE id = ?',
        [payment.id]
      );

      // Update parent order
      await connection.query(
        'UPDATE orders SET payment_status = "PAID", order_status = "PROCESSING", updated_at = NOW() WHERE id = ?',
        [orderId]
      );

      // Update child seller_orders to CONFIRMED
      await connection.query(
        'UPDATE seller_orders SET status = "CONFIRMED", updated_at = NOW() WHERE order_id = ? AND status = "PENDING"',
        [orderId]
      );

      await connection.commit();

      return {
        success: true,
        message: 'Payment verified and settled successfully.',
        transactionReference,
        status: 'PAID',
        cardLast4
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Submit manual bank transfer proof and details
   */
  async submitBankTransferProof({ orderId, transactionReference, proofUrl, notes }) {
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? AND payment_provider = "bank_transfer"',
      [orderId]
    );

    if (payments.length === 0) {
      throw new Error('Bank transfer payment session not found for this order.');
    }

    const payment = payments[0];

    await pool.query(
      `UPDATE payments 
       SET transaction_reference = COALESCE(?, transaction_reference),
           proof_url = ?,
           admin_notes = ?,
           status = 'PENDING'
       WHERE id = ?`,
      [transactionReference, proofUrl, notes || 'Submitted by buyer, pending admin verification', payment.id]
    );

    return {
      success: true,
      message: 'Bank transfer submitted. Status is PENDING VERIFICATION by Administrator.',
      status: 'PENDING'
    };
  }

  /**
   * Admin approves or rejects manual bank transfer
   */
  async adminVerifyBankTransfer({ paymentId, isApproved, adminNotes }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [payments] = await connection.query(
        'SELECT * FROM payments WHERE id = ?',
        [paymentId]
      );

      if (payments.length === 0) {
        throw new Error('Payment record not found.');
      }

      const payment = payments[0];
      const newStatus = isApproved ? 'PAID' : 'FAILED';

      await connection.query(
        'UPDATE payments SET status = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, adminNotes || (isApproved ? 'Verified by Admin' : 'Rejected by Admin'), paymentId]
      );

      if (isApproved) {
        await connection.query(
          'UPDATE orders SET payment_status = "PAID", order_status = "PROCESSING" WHERE id = ?',
          [payment.order_id]
        );
        await connection.query(
          'UPDATE seller_orders SET status = "CONFIRMED" WHERE order_id = ? AND status = "PENDING"',
          [payment.order_id]
        );
      } else {
        await connection.query(
          'UPDATE orders SET payment_status = "FAILED" WHERE id = ?',
          [payment.order_id]
        );
      }

      await connection.commit();

      return {
        success: true,
        paymentId,
        status: newStatus,
        message: isApproved ? 'Payment approved and verified.' : 'Payment rejected.'
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new PaymentService();
