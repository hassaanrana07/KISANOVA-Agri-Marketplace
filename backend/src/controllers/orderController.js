const pool = require('../config/db');
const paymentService = require('../services/paymentService');

/**
 * Checkout & Create Multi-Seller Order in a Transaction
 */
const checkout = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const buyerId = req.user.id;
    const {
      delivery_name,
      delivery_phone,
      delivery_address,
      delivery_notes,
      payment_method = 'card' // 'card' or 'bank_transfer'
    } = req.body;

    if (!delivery_name || !delivery_phone || !delivery_address) {
      return res.status(400).json({
        success: false,
        message: 'Delivery name, phone number, and delivery address are required.'
      });
    }

    // 1. Fetch current cart items
    const [cartItems] = await connection.query(
      `SELECT 
         ci.id as item_id, ci.product_id, ci.seller_id, ci.quantity,
         p.title, p.price, p.available_quantity, p.status as product_status,
         s.farm_name, s.approval_status as seller_approval
       FROM carts c
       JOIN cart_items ci ON c.id = ci.cart_id
       JOIN products p ON ci.product_id = p.id
       JOIN sellers s ON ci.seller_id = s.id
       WHERE c.buyer_id = ?`,
      [buyerId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add agricultural products before checkout.'
      });
    }

    // 2. Validate stock and seller approval for all items
    for (const item of cartItems) {
      if (item.product_status !== 'APPROVED' || item.seller_approval !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: `Product "${item.title}" is no longer available.`
        });
      }
      if (parseFloat(item.quantity) > parseFloat(item.available_quantity)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${item.title}". Only ${item.available_quantity} available.`
        });
      }
    }

    await connection.beginTransaction();

    // 3. Group cart items by seller
    const sellerGroups = {};
    let grandTotal = 0;

    cartItems.forEach((item) => {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.price);
      grandTotal += itemSubtotal;

      if (!sellerGroups[item.seller_id]) {
        sellerGroups[item.seller_id] = {
          seller_id: item.seller_id,
          subtotal: 0,
          items: []
        };
      }
      sellerGroups[item.seller_id].subtotal += itemSubtotal;
      sellerGroups[item.seller_id].items.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: itemSubtotal
      });
    });

    // 4. Create Parent Order
    const orderNumber = 'KSN-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
        (order_number, buyer_id, total_amount, delivery_name, delivery_phone, delivery_address, delivery_notes, payment_status, order_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING')`,
      [orderNumber, buyerId, grandTotal, delivery_name, delivery_phone, delivery_address, delivery_notes || null]
    );

    const parentOrderId = orderResult.insertId;

    // 5. Create Seller Orders and Order Items
    for (const sellerId of Object.keys(sellerGroups)) {
      const group = sellerGroups[sellerId];
      const [sellerOrderResult] = await connection.query(
        `INSERT INTO seller_orders (order_id, seller_id, subtotal, status)
         VALUES (?, ?, ?, 'PENDING')`,
        [parentOrderId, sellerId, group.subtotal]
      );

      const sellerOrderId = sellerOrderResult.insertId;

      for (const itm of group.items) {
        await connection.query(
          `INSERT INTO order_items (seller_order_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [sellerOrderId, itm.product_id, itm.quantity, itm.unit_price, itm.subtotal]
        );

        // Decrement product inventory
        await connection.query(
          'UPDATE products SET available_quantity = available_quantity - ? WHERE id = ?',
          [itm.quantity, itm.product_id]
        );
      }
    }

    // 6. Clear buyer's cart
    const [carts] = await connection.query('SELECT id FROM carts WHERE buyer_id = ?', [buyerId]);
    if (carts.length > 0) {
      await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
    }

    await connection.commit();

    // 7. Initiate Payment Session via Payment Service Abstraction
    const paymentSession = await paymentService.createPaymentSession({
      orderId: parentOrderId,
      amount: grandTotal,
      buyerEmail: req.user.email,
      buyerName: delivery_name,
      paymentMethod: payment_method
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully. Proceed to payment settlement.',
      data: {
        orderId: parentOrderId,
        orderNumber,
        totalAmount: grandTotal,
        sellerCount: Object.keys(sellerGroups).length,
        paymentSession
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Checkout processing failed.',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Get Authenticated Buyer's Orders
 */
const getBuyerOrders = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const [orders] = await pool.query(
      `SELECT 
         o.id, o.order_number, o.total_amount, o.delivery_name, o.delivery_phone,
         o.delivery_address, o.payment_status, o.order_status, o.created_at,
         COUNT(DISTINCT so.id) as seller_count,
         COUNT(oi.id) as total_items_count
       FROM orders o
       LEFT JOIN seller_orders so ON o.id = so.order_id
       LEFT JOIN order_items oi ON so.id = oi.seller_order_id
       WHERE o.buyer_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [buyerId]
    );

    return res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders.'
    });
  }
};

/**
 * Get Specific Order Details for Buyer or Admin
 */
const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    // Fetch parent order
    let orderQuery = 'SELECT * FROM orders WHERE id = ?';
    let queryParams = [id];

    if (role !== 'ADMIN') {
      orderQuery += ' AND buyer_id = ?';
      queryParams.push(userId);
    }

    const [orders] = await pool.query(orderQuery, queryParams);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const order = orders[0];

    // Fetch seller_orders with farm info
    const [sellerOrders] = await pool.query(
      `SELECT 
         so.id as seller_order_id,
         so.seller_id,
         so.subtotal,
         so.status as seller_order_status,
         s.farm_name,
         s.phone as seller_phone,
         s.address as seller_address
       FROM seller_orders so
       JOIN sellers s ON so.seller_id = s.id
       WHERE so.order_id = ?
       ORDER BY s.farm_name ASC`,
      [id]
    );

    // Fetch order items for each seller_order
    for (const so of sellerOrders) {
      const [items] = await pool.query(
        `SELECT 
           oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.subtotal,
           p.title as product_title, p.unit as product_unit, p.category,
           COALESCE(
             (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1),
             'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=200&q=80'
           ) as product_image
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.seller_order_id = ?`,
        [so.seller_order_id]
      );
      so.items = items;
    }

    // Fetch payment record
    const [payments] = await pool.query(
      'SELECT id, payment_provider, transaction_reference, amount, currency, status, payment_method, proof_url, admin_notes, created_at FROM payments WHERE order_id = ?',
      [id]
    );

    return res.json({
      success: true,
      data: {
        order,
        sellerOrders,
        payment: payments.length > 0 ? payments[0] : null
      }
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order details.'
    });
  }
};

module.exports = {
  checkout,
  getBuyerOrders,
  getOrderDetails
};
