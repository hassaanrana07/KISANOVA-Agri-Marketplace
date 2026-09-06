const pool = require('../config/db');

/**
 * Payment Service — Kisanova Agricultural Marketplace
 * Strictly supports only:
 * Cash on Delivery (COD)
 * 
 * All online payment gateways, fake verification sessions, sandboxes,
 * and external webhooks have been permanently decommissioned.
 */
class PaymentService {
  constructor() {
    this.currency = 'PKR';
  }

  /**
   * Create an initial payment record for an order (COD)
   */
  async createPaymentRecord({ orderId, amount }) {
    const crypto = require('crypto');
    const formattedAmount = parseFloat(amount).toFixed(2);
    const validMethod = 'COD';
    const receiptNumber = `REC-${orderId}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const [result] = await pool.query(
      `INSERT INTO payments 
        (order_id, receipt_number, amount, currency, amount_paid, amount_remaining, status, payment_method)
       VALUES (?, ?, ?, ?, 0.00, ?, 'UNPAID', ?)`,
      [orderId, receiptNumber, formattedAmount, this.currency, formattedAmount, validMethod]
    );

    return {
      paymentId: result.insertId,
      receiptNumber,
      amount: formattedAmount,
      currency: this.currency,
      status: 'UNPAID',
      paymentMethod: validMethod,
      instruction: 'Payment will be collected in cash upon physical handover (Cash on Delivery).'
    };
  }

  /**
   * Get Printable/Official Payment Receipt for an Order
   */
  async getPaymentReceipt(orderId, user) {
    const [orders] = await pool.query(
      `SELECT o.*, u.name as buyer_name, u.email as buyer_email
       FROM orders o
       JOIN users u ON o.buyer_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      throw new Error('Order not found.');
    }

    const order = orders[0];

    // Authorization: User must be buyer, admin, or a seller with items in this order
    if (user.role === 'BUYER' && order.buyer_id !== user.id) {
      throw new Error('Access denied. You do not own this order.');
    }

    if (user.role === 'SELLER') {
      const [sellers] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [user.id]);
      if (sellers.length === 0) throw new Error('Seller profile not found.');
      const sellerId = sellers[0].id;
      const [sellerOrders] = await pool.query(
        'SELECT id FROM seller_orders WHERE order_id = ? AND seller_id = ?',
        [orderId, sellerId]
      );
      if (sellerOrders.length === 0) {
        throw new Error('Access denied. No items from your farm in this order.');
      }
    }

    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );

    const [items] = await pool.query(
      `SELECT oi.*, p.title as product_title, p.unit as product_unit, s.farm_name, s.phone as seller_phone
       FROM order_items oi
       JOIN seller_orders so ON oi.seller_order_id = so.id
       JOIN products p ON oi.product_id = p.id
       JOIN sellers s ON so.seller_id = s.id
       WHERE so.order_id = ?`,
      [orderId]
    );

    const payment = payments.length > 0 ? payments[0] : null;

    const receiptNumber = payment?.receipt_number || `REC-${order.order_number}`;

    return {
      receiptNumber,
      orderNumber: order.order_number,
      orderDate: order.created_at,
      buyerName: order.delivery_name || order.buyer_name,
      buyerPhone: order.delivery_phone,
      deliveryAddress: order.delivery_address || 'Farm Gate Self-Pickup (No Delivery Address Required)',
      fulfillmentMethod: order.fulfillment_method || 'DELIVERY',
      deliveryFee: parseFloat(order.delivery_fee || 0),
      estimatedDeliveryDays: order.estimated_delivery_min_days
        ? `${order.estimated_delivery_min_days}–${order.estimated_delivery_max_days || 4} days`
        : null,
      pickupInstructions: order.pickup_instructions || null,
      paymentMethod: order.payment_method || 'COD',
      paymentStatus: order.payment_status,
      totalAmount: parseFloat(order.total_amount),
      amountPaid: parseFloat(order.amount_paid || 0),
      amountRemaining: parseFloat(order.amount_remaining || order.total_amount),
      currency: 'PKR',
      items,
      settledAt: order.payment_status === 'PAID' ? (payment?.updated_at || order.updated_at) : null
    };
  }

  /**
   * Get payment record by order ID with IDOR protection
   */
  async getPaymentStatus(orderId, user) {
    const [orders] = await pool.query('SELECT id, buyer_id FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      throw new Error('Order not found.');
    }

    const order = orders[0];
    if (user.role === 'BUYER' && order.buyer_id !== user.id) {
      throw new Error('Access denied. You do not own this order.');
    }

    if (user.role === 'SELLER') {
      const [sellers] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [user.id]);
      if (sellers.length === 0) throw new Error('Seller profile not found.');
      const [sellerOrders] = await pool.query(
        'SELECT id FROM seller_orders WHERE order_id = ? AND seller_id = ?',
        [orderId, sellers[0].id]
      );
      if (sellerOrders.length === 0) {
        throw new Error('Access denied. No items from your farm in this order.');
      }
    }

    const [payments] = await pool.query(
      `SELECT id, order_id, receipt_number, amount, currency, 
              amount_paid, amount_remaining, status, payment_method, created_at, updated_at 
       FROM payments 
       WHERE order_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    if (payments.length === 0) {
      return null;
    }

    return payments[0];
  }
}

module.exports = new PaymentService();
