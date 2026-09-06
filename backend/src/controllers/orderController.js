const crypto = require('crypto');
const pool = require('../config/db');
const paymentService = require('../services/paymentService');
const socketService = require('../services/socketService');

/**
 * Checkout & Create Multi-Seller Order in a Transaction
 * Supports:
 * - Fulfillment methods (Delivery vs Farm Pickup)
 * - Dynamic delivery fee addition
 * - Strict seller fulfillment validation
 * - PKR exact monetary accounting (subtotal + delivery_fee = total)
 * - Pure Cash on Delivery (COD) workflow
 * - Initial payment status is UNPAID
 * - Real-time Socket.IO notifications to sellers
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
      fulfillment_method = 'DELIVERY', // global fallback: 'DELIVERY' or 'PICKUP'
      seller_fulfillments = {} // optional per-seller mapping: { [sellerId]: 'DELIVERY' | 'PICKUP' }
    } = req.body;

    if (!delivery_name || !delivery_phone) {
      return res.status(400).json({
        success: false,
        message: 'Recipient contact name and phone number are required.'
      });
    }

    // 1. Fetch current cart items with seller fulfillment capabilities
    const [cartItems] = await connection.query(
      `SELECT 
         ci.id as item_id, ci.product_id, ci.seller_id, ci.quantity,
         p.title, p.price, p.available_quantity, p.status as product_status,
         s.farm_name, s.approval_status as seller_approval,
         s.delivery_available, s.pickup_available, s.delivery_fee as seller_delivery_fee,
         s.estimated_delivery_min_days, s.estimated_delivery_max_days, s.pickup_instructions
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

    // 2. Determine fulfillment method per seller and check if delivery address is required
    const resolveFulfillment = (val) => {
      const raw = (typeof val === 'object' && val !== null ? val.fulfillment_type : val) || fulfillment_method || 'DELIVERY';
      const upper = String(raw).toUpperCase();
      return (upper === 'PICKUP' || upper === 'FARM_PICKUP') ? 'PICKUP' : 'DELIVERY';
    };

    let anyDeliveryRequired = false;
    for (const item of cartItems) {
      const sellerFulfillment = resolveFulfillment(seller_fulfillments[item.seller_id]);
      if (sellerFulfillment === 'DELIVERY') {
        anyDeliveryRequired = true;
      }
    }

    if (anyDeliveryRequired && (!delivery_address || !delivery_address.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for orders with courier delivery.'
      });
    }

    // 3. Validate stock, seller approval, and fulfillment capability per item
    for (const item of cartItems) {
      if (item.product_status !== 'ACTIVE' || item.seller_approval !== 'APPROVED') {
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
      const sFulfillment = resolveFulfillment(seller_fulfillments[item.seller_id]);
      if (sFulfillment === 'DELIVERY' && item.delivery_available === 0) {
        return res.status(400).json({
          success: false,
          message: `Delivery is not offered by ${item.farm_name}. Please choose Farm Gate Self-Pickup.`
        });
      }
      if (sFulfillment === 'PICKUP' && item.pickup_available === 0) {
        return res.status(400).json({
          success: false,
          message: `Farm Pickup is not offered by ${item.farm_name}. Please choose Courier Delivery.`
        });
      }
    }

    await connection.beginTransaction();

    // 4. Group cart items by seller & calculate subtotals and fulfillment fees
    const sellerGroups = {};
    let itemsSubtotal = 0;
    let totalDeliveryFee = 0;
    let minDeliveryDays = 999;
    let maxDeliveryDays = 0;
    const combinedPickupInstructions = [];

    cartItems.forEach((item) => {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.price);
      itemsSubtotal += itemSubtotal;

      const sFulfillment = resolveFulfillment(seller_fulfillments[item.seller_id]);

      if (!sellerGroups[item.seller_id]) {
        const sellerFee = sFulfillment === 'DELIVERY'
          ? (item.seller_delivery_fee !== null ? parseFloat(item.seller_delivery_fee) : 300.00)
          : 0.00;

        totalDeliveryFee += sellerFee;

        if (sFulfillment === 'DELIVERY') {
          if (item.estimated_delivery_min_days && item.estimated_delivery_min_days < minDeliveryDays) {
            minDeliveryDays = item.estimated_delivery_min_days;
          }
          if (item.estimated_delivery_max_days && item.estimated_delivery_max_days > maxDeliveryDays) {
            maxDeliveryDays = item.estimated_delivery_max_days;
          }
        }

        if (item.pickup_instructions) {
          combinedPickupInstructions.push(`${item.farm_name}: ${item.pickup_instructions}`);
        }

        sellerGroups[item.seller_id] = {
          seller_id: item.seller_id,
          fulfillment_method: sFulfillment,
          subtotal: 0,
          delivery_fee: sellerFee,
          pickup_instructions: item.pickup_instructions || null,
          items: []
        };
      }

      sellerGroups[item.seller_id].subtotal += itemSubtotal;
      sellerGroups[item.seller_id].items.push({
        product_id: item.product_id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: itemSubtotal
      });
    });

    const grandTotal = itemsSubtotal + totalDeliveryFee;
    const orderNumber = 'KSN-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);

    // Determine overall fulfillment and payment method
    const sellerFulfillmentList = Object.values(sellerGroups).map(g => g.fulfillment_method);
    const allPickup = sellerFulfillmentList.every(f => f === 'PICKUP');
    const allDelivery = sellerFulfillmentList.every(f => f === 'DELIVERY');
    const parentFulfillment = allPickup ? 'PICKUP' : allDelivery ? 'DELIVERY' : 'MIXED';
    const parentPaymentMethod = allPickup ? 'FARM_PICKUP' : 'COD';

    // 5. Create Parent Order
    const [orderResult] = await connection.query(
      `INSERT INTO orders 
        (order_number, buyer_id, total_amount, currency, fulfillment_method, delivery_fee, 
         estimated_delivery_min_days, estimated_delivery_max_days, pickup_instructions,
         amount_due, amount_paid, amount_remaining,
         delivery_name, delivery_phone, delivery_address, delivery_notes, 
         payment_method, payment_status, order_status)
       VALUES (?, ?, ?, 'PKR', ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, 'UNPAID', 'PENDING')`,
      [
        orderNumber,
        buyerId,
        grandTotal,
        parentFulfillment,
        totalDeliveryFee,
        minDeliveryDays !== 999 ? minDeliveryDays : (allPickup ? null : 2),
        maxDeliveryDays !== 0 ? maxDeliveryDays : (allPickup ? null : 4),
        combinedPickupInstructions.join(' | ') || null,
        grandTotal,
        grandTotal,
        delivery_name,
        delivery_phone,
        anyDeliveryRequired ? delivery_address.trim() : (delivery_address ? delivery_address.trim() : 'Farm Gate Self-Pickup'),
        delivery_notes || null,
        parentPaymentMethod
      ]
    );

    const parentOrderId = orderResult.insertId;
    const createdSellerOrders = [];

    // 6. Create Seller Orders and Order Items with Atomic Stock Decrements
    for (const sellerId of Object.keys(sellerGroups)) {
      const group = sellerGroups[sellerId];
      const sellerOrderTotal = group.subtotal + group.delivery_fee;
      const sellerPaymentMethod = group.fulfillment_method === 'PICKUP' ? 'FARM_PICKUP' : 'COD';

      const [sellerOrderResult] = await connection.query(
        `INSERT INTO seller_orders 
          (order_id, seller_id, subtotal, fulfillment_method, delivery_fee, 
           amount_due, amount_paid, amount_remaining,
           payment_method, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, 0.00, ?, ?, 'UNPAID', 'PENDING')`,
        [
          parentOrderId,
          sellerId,
          group.subtotal,
          group.fulfillment_method,
          group.delivery_fee,
          sellerOrderTotal,
          sellerOrderTotal,
          sellerPaymentMethod
        ]
      );

      const sellerOrderId = sellerOrderResult.insertId;
      createdSellerOrders.push({
        sellerId: parseInt(sellerId, 10),
        sellerOrderId,
        total: sellerOrderTotal,
        fulfillmentMethod: group.fulfillment_method,
        paymentMethod: sellerPaymentMethod,
        itemCount: group.items.length
      });

      for (const itm of group.items) {
        await connection.query(
          `INSERT INTO order_items (seller_order_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [sellerOrderId, itm.product_id, itm.quantity, itm.unit_price, itm.subtotal]
        );

        // ATOMIC INVENTORY DECREMENT: Ensures stock never drops below zero even under concurrent requests
        const [decResult] = await connection.query(
          'UPDATE products SET available_quantity = available_quantity - ? WHERE id = ? AND available_quantity >= ?',
          [itm.quantity, itm.product_id, itm.quantity]
        );

        if (decResult.affectedRows === 0) {
          throw new Error(`Insufficient available stock for product "${itm.title}". The item was purchased concurrently by another user.`);
        }
      }
    }

    // 7. Create payment audit record
    const receiptNumber = `REC-${parentOrderId}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    await connection.query(
      `INSERT INTO payments 
        (order_id, payment_method, receipt_number, amount, currency, amount_paid, amount_remaining, status)
       VALUES (?, ?, ?, ?, 'PKR', 0.00, ?, 'UNPAID')`,
      [
        parentOrderId,
        parentPaymentMethod,
        receiptNumber,
        grandTotal,
        grandTotal
      ]
    );

    // 8. Clear buyer's cart
    const [carts] = await connection.query('SELECT id FROM carts WHERE buyer_id = ?', [buyerId]);
    if (carts.length > 0) {
      await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
    }

    await connection.commit();

    // 9. Real-Time Socket.IO & Notification Dispatch to Sellers
    for (const sOrd of createdSellerOrders) {
      try {
        const [sellerRows] = await pool.query('SELECT user_id, farm_name FROM sellers WHERE id = ?', [sOrd.sellerId]);
        if (sellerRows.length > 0) {
          const sellerUserId = sellerRows[0].user_id;
          const fulfillmentLabel = sOrd.fulfillmentMethod === 'PICKUP' ? 'Farm Gate Self-Pickup' : 'Cash on Delivery';
          const notifTitle = 'New Customer Order Received';
          const notifMsg = `Order #${orderNumber} placed by ${delivery_name} for PKR ${sOrd.total.toLocaleString()} (${fulfillmentLabel}).`;
          const notifLink = `/seller/orders/${sOrd.sellerOrderId}`;

          const [notifResult] = await pool.query(
            `INSERT INTO notifications (user_id, seller_id, type, title, message, link, is_read)
             VALUES (?, ?, 'NEW_ORDER', ?, ?, ?, FALSE)`,
            [sellerUserId, sOrd.sellerId, notifTitle, notifMsg, notifLink]
          );

          socketService.emitToUser(sellerUserId, 'new_order', {
            notificationId: notifResult.insertId,
            orderId: parentOrderId,
            sellerOrderId: sOrd.sellerOrderId,
            orderNumber,
            buyerName: delivery_name,
            totalAmount: sOrd.total,
            fulfillmentMethod: sOrd.fulfillmentMethod,
            paymentMethod: sOrd.paymentMethod,
            title: notifTitle,
            message: notifMsg,
            created_at: new Date().toISOString()
          });
        }
      } catch (notifErr) {
        console.error('Error creating seller order notification:', notifErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: parentPaymentMethod === 'FARM_PICKUP'
        ? 'Order placed successfully for Farm Gate Self-Pickup.'
        : 'Order placed successfully with Cash on Delivery.',
      data: {
        orderId: parentOrderId,
        orderNumber,
        itemsSubtotal,
        deliveryFee: totalDeliveryFee,
        totalAmount: grandTotal,
        currency: 'PKR',
        fulfillmentMethod: parentFulfillment,
        paymentMethod: parentPaymentMethod,
        paymentStatus: 'UNPAID',
        sellerCount: Object.keys(sellerGroups).length
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Checkout error:', error);

    // Distinguish client-facing inventory validation errors from internal SQL/system errors
    const isInventoryError = error.message && error.message.includes('Insufficient');
    const safeMessage = isInventoryError
      ? error.message
      : 'An error occurred while processing your checkout. Please verify your order and try again.';

    return res.status(400).json({
      success: false,
      message: safeMessage
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
         o.id, o.order_number, o.total_amount, o.currency, o.fulfillment_method, o.delivery_fee,
         o.amount_due, o.amount_paid, o.amount_remaining,
         o.delivery_name, o.delivery_phone, o.delivery_address, 
         o.payment_method, o.payment_status, o.order_status, o.created_at,
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
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const order = orders[0];

    if (role !== 'ADMIN' && order.buyer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this order.'
      });
    }

    // Fetch seller_orders with farm info & per-seller delivery estimates
    const [sellerOrders] = await pool.query(
      `SELECT 
         so.id as seller_order_id,
         so.seller_id,
         so.subtotal,
         so.fulfillment_method,
         so.delivery_fee,
         so.amount_due,
         so.amount_paid,
         so.amount_remaining,
         so.payment_status,
         so.status as seller_order_status,
         s.farm_name,
         s.phone as seller_phone,
         s.address as seller_address,
         s.pickup_instructions,
         s.estimated_delivery_min_days,
         s.estimated_delivery_max_days
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
      `SELECT id, receipt_number, amount, currency, 
              amount_paid, amount_remaining, status, payment_method, proof_url, admin_notes, created_at 
       FROM payments 
       WHERE order_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
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
