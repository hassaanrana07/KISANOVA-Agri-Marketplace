const pool = require('../config/db');
const { uploadMedia } = require('../services/storageService');

/**
 * Helper to ensure user is an approved seller where applicable
 */
const getSellerFromUser = async (userId) => {
  const [sellers] = await pool.query('SELECT * FROM sellers WHERE user_id = ?', [userId]);
  return sellers.length > 0 ? sellers[0] : null;
};

/**
 * Seller Dashboard Overview Metrics
 */
const getDashboardMetrics = async (req, res) => {
  try {
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    // 1. Summary Cards Aggregations (Real PKR metrics for COD and Farm Pickup)
    const [statsResult] = await pool.query(
      `SELECT 
         COUNT(so.id) as total_orders,
         COALESCE(SUM(CASE WHEN so.status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP') THEN 1 ELSE 0 END), 0) as pending_orders,
         COALESCE(SUM(CASE WHEN so.status IN ('DELIVERED', 'PICKED_UP') THEN 1 ELSE 0 END), 0) as completed_orders,
         COALESCE(SUM(CASE WHEN so.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) as cancelled_orders,
         COALESCE(SUM(CASE WHEN so.status != 'CANCELLED' THEN so.subtotal + COALESCE(so.delivery_fee, 0) ELSE 0 END), 0) as gross_order_value,
         COALESCE(SUM(CASE WHEN so.status = 'CANCELLED' THEN so.subtotal + COALESCE(so.delivery_fee, 0) ELSE 0 END), 0) as cancelled_sales,
         COALESCE(SUM(CASE WHEN so.payment_status = 'PAID' THEN so.subtotal + COALESCE(so.delivery_fee, 0) ELSE 0 END), 0) as cash_collected,
         COALESCE(SUM(CASE WHEN so.payment_status != 'PAID' AND so.status != 'CANCELLED' AND so.payment_method = 'COD' THEN so.subtotal + COALESCE(so.delivery_fee, 0) ELSE 0 END), 0) as pending_cod_amount,
         COALESCE(SUM(CASE WHEN so.status != 'CANCELLED' AND (so.payment_method = 'FARM_PICKUP' OR so.fulfillment_method = 'PICKUP') THEN so.subtotal ELSE 0 END), 0) as farm_pickup_amount
       FROM seller_orders so
       WHERE so.seller_id = ?`,
      [seller.id]
    );

    // 2. Order status distribution
    const [orderStatusCounts] = await pool.query(
      `SELECT status, COUNT(id) as count
       FROM seller_orders
       WHERE seller_id = ?
       GROUP BY status`,
      [seller.id]
    );

    // 3. Payment status distribution
    const [paymentStatusCounts] = await pool.query(
      `SELECT payment_status, COUNT(id) as count
       FROM seller_orders
       WHERE seller_id = ?
       GROUP BY payment_status`,
      [seller.id]
    );

    // 4. Product counts
    const [productCounts] = await pool.query(
      `SELECT status, COUNT(id) as count
       FROM products
       WHERE seller_id = ?
       GROUP BY status`,
      [seller.id]
    );

    // 5. Orders & Revenue timeline (Past 30 days)
    const [timelineData] = await pool.query(
      `SELECT 
         DATE_FORMAT(o.created_at, '%Y-%m-%d') as date_label,
         COUNT(so.id) as orders_count,
         COALESCE(SUM(so.subtotal), 0) as revenue
       FROM seller_orders so
       JOIN orders o ON so.order_id = o.id
       WHERE so.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
       ORDER BY date_label ASC
       LIMIT 14`,
      [seller.id]
    );

    // 6. Recent orders for this seller
    const [recentOrders] = await pool.query(
      `SELECT 
         so.id as seller_order_id,
         so.order_id,
         o.order_number,
         o.created_at,
         so.subtotal,
         so.delivery_fee,
         so.status as seller_status,
         so.payment_status,
         so.payment_method,
         so.fulfillment_method,
         o.delivery_name,
         COUNT(oi.id) as items_count
       FROM seller_orders so
       JOIN orders o ON so.order_id = o.id
       LEFT JOIN order_items oi ON so.id = oi.seller_order_id
       WHERE so.seller_id = ?
       GROUP BY so.id
       ORDER BY o.created_at DESC
       LIMIT 6`,
      [seller.id]
    );

    const stats = statsResult[0] || {};
    const grossOrderValue = parseFloat(stats.gross_order_value || 0);
    const cashCollected = parseFloat(stats.cash_collected || 0);
    const pendingCodAmount = parseFloat(stats.pending_cod_amount || 0);
    const farmPickupAmount = parseFloat(stats.farm_pickup_amount || 0);

    return res.json({
      success: true,
      data: {
        seller,
        metrics: {
          currency: 'PKR',
          totalOrders: Number(stats.total_orders || 0),
          pendingOrders: Number(stats.pending_orders || 0),
          completedOrders: Number(stats.completed_orders || 0),
          cancelledOrders: Number(stats.cancelled_orders || 0),
          grossOrderValue,
          cancelledSales: parseFloat(stats.cancelled_sales || 0),
          cashCollected,
          pendingCodAmount,
          farmPickupAmount,
          totalRevenue: cashCollected, // Cash actually collected/settled
          paidAmount: cashCollected,
          pendingPaymentAmount: pendingCodAmount,
          orderStatusCounts,
          paymentStatusCounts,
          productCounts,
          timelineData
        },
        recentOrders
      }
    });
  } catch (error) {
    console.error('Error fetching seller dashboard:', error);
    return res.status(500).json({ success: false, message: 'Failed to load seller dashboard.' });
  }
};

/**
 * Get Seller's Products
 */
const getSellerProducts = async (req, res) => {
  try {
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const { status } = req.query;
    let query = `
      SELECT 
        p.id, p.title, p.category, p.crop_type, p.price, p.unit,
        p.available_quantity, p.status, p.created_at, p.updated_at,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
      FROM products p
      WHERE p.seller_id = ?
    `;
    const params = [seller.id];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC';

    const [products] = await pool.query(query, params);

    return res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

/**
 * Create a New Product (Starts as PENDING)
 */
const createProduct = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const { title, category, crop_type, description, price, unit, available_quantity, image_urls } = req.body;

    if (!title || !category || !description || !price || !unit) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, description, price, and unit are required.'
      });
    }

    await connection.beginTransaction();

    // Products created by approved sellers are immediately ACTIVE
    const [result] = await connection.query(
      `INSERT INTO products 
        (seller_id, title, category, crop_type, description, price, unit, available_quantity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        seller.id,
        title,
        category,
        crop_type || null,
        description,
        parseFloat(price),
        unit,
        parseFloat(available_quantity || 0)
      ]
    );

    const productId = result.insertId;

    // Handle uploaded file images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploaded = await uploadMedia(file.path, { resource_type: 'image' });
        uploadedImages.push(uploaded.url);
      }
    }

    // Also support direct image URLs provided in payload
    if (image_urls) {
      const urls = Array.isArray(image_urls) ? image_urls : [image_urls];
      uploadedImages.push(...urls.filter(u => typeof u === 'string' && u.trim().length > 0));
    }

    // Default fallback image if none provided
    if (uploadedImages.length === 0) {
      uploadedImages.push('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80');
    }

    for (let i = 0; i < uploadedImages.length; i++) {
      await connection.query(
        'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, ?)',
        [productId, uploadedImages[i], i === 0]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Product published successfully to the marketplace.',
      data: {
        id: productId,
        title,
        status: 'ACTIVE'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to create product.', error: error.message });
  } finally {
    connection.release();
  }
};

/**
 * Edit Product
 */
const updateProduct = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    // Verify ownership
    const [existing] = await connection.query(
      'SELECT id, status FROM products WHERE id = ? AND seller_id = ?',
      [id, seller.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied.'
      });
    }

    const { title, category, crop_type, description, price, unit, available_quantity, status } = req.body;

    await connection.beginTransaction();

    // Seller can update details, but if they change key data, it may remain or re-enter PENDING
    // Also seller can set status to INACTIVE to temporarily pause sales
    const updatedStatus = (status === 'INACTIVE') ? 'INACTIVE' : existing[0].status;

    await connection.query(
      `UPDATE products 
       SET title = COALESCE(?, title),
           category = COALESCE(?, category),
           crop_type = COALESCE(?, crop_type),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           unit = COALESCE(?, unit),
           available_quantity = COALESCE(?, available_quantity),
           status = ?,
           updated_at = NOW()
       WHERE id = ? AND seller_id = ?`,
      [
        title || null,
        category || null,
        crop_type || null,
        description || null,
        price ? parseFloat(price) : null,
        unit || null,
        available_quantity !== undefined ? parseFloat(available_quantity) : null,
        updatedStatus,
        id,
        seller.id
      ]
    );

    // Handle new uploaded images if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadMedia(file.path, { resource_type: 'image' });
        await connection.query(
          'INSERT INTO product_images (product_id, image_url, is_primary) VALUES (?, ?, FALSE)',
          [id, uploaded.url]
        );
      }
    }

    await connection.commit();

    return res.json({
      success: true,
      message: 'Product updated successfully.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating product:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  } finally {
    connection.release();
  }
};

/**
 * Delete / Deactivate Product
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    // Explicit ownership check
    const [existing] = await pool.query(
      'SELECT id, status FROM products WHERE id = ? AND seller_id = ?',
      [id, seller.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied.'
      });
    }

    // Set to INACTIVE or delete if no order references
    const [ordersCheck] = await pool.query(
      'SELECT id FROM order_items WHERE product_id = ? LIMIT 1',
      [id]
    );

    if (ordersCheck.length > 0) {
      // Deactivate product to preserve historical order logs
      await pool.query(
        'UPDATE products SET status = "INACTIVE" WHERE id = ? AND seller_id = ?',
        [id, seller.id]
      );
      return res.json({
        success: true,
        message: 'Product has order history and was safely set to INACTIVE.'
      });
    }

    await pool.query(
      'DELETE FROM products WHERE id = ? AND seller_id = ?',
      [id, seller.id]
    );

    return res.json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
};

/**
 * Get Seller-Specific Orders
 * Seller can ONLY see orders containing that seller's products!
 */
const getSellerOrders = async (req, res) => {
  try {
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const { status } = req.query;
    let query = `
      SELECT 
        so.id as seller_order_id,
        so.order_id,
        so.subtotal,
        so.status as seller_order_status,
        so.created_at,
        o.order_number,
        o.delivery_name,
        o.delivery_phone,
        o.delivery_address,
        o.delivery_notes,
        COALESCE(so.payment_method, o.payment_method) as payment_method,
        COALESCE(so.payment_status, o.payment_status) as payment_status,
        COALESCE(so.amount_due, so.subtotal + COALESCE(so.delivery_fee, 0)) as amount_due,
        COALESCE(so.amount_paid, 0.00) as amount_paid,
        COALESCE(so.amount_remaining, so.subtotal + COALESCE(so.delivery_fee, 0) - COALESCE(so.amount_paid, 0.00)) as amount_remaining,
        COUNT(oi.id) as items_count
      FROM seller_orders so
      JOIN orders o ON so.order_id = o.id
      LEFT JOIN order_items oi ON so.id = oi.seller_order_id
      WHERE so.seller_id = ?
    `;
    const params = [seller.id];

    if (status) {
      query += ' AND so.status = ?';
      params.push(status);
    }

    query += ' GROUP BY so.id ORDER BY so.created_at DESC';

    const [sellerOrders] = await pool.query(query, params);

    return res.json({
      success: true,
      data: sellerOrders
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch seller orders.' });
  }
};

/**
 * Get Specific Seller Order Details with its Items
 */
const getSellerOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const [subOrders] = await pool.query(
      `SELECT 
         so.id as seller_order_id,
         so.order_id,
         so.seller_id,
         so.subtotal,
         so.status as seller_order_status,
         so.created_at,
         o.order_number,
         o.delivery_name,
         o.delivery_phone,
         o.delivery_address,
         o.delivery_notes,
         COALESCE(so.payment_method, o.payment_method) as payment_method,
         COALESCE(so.payment_status, o.payment_status) as payment_status,
         COALESCE(so.amount_due, so.subtotal + COALESCE(so.delivery_fee, 0)) as amount_due,
         COALESCE(so.amount_paid, 0.00) as amount_paid,
         COALESCE(so.amount_remaining, so.subtotal + COALESCE(so.delivery_fee, 0) - COALESCE(so.amount_paid, 0.00)) as amount_remaining,
         COALESCE(so.fulfillment_method, o.fulfillment_method, 'DELIVERY') as fulfillment_method,
         COALESCE(so.delivery_fee, 0) as delivery_fee,
         u.name as buyer_name,
         u.email as buyer_email
       FROM seller_orders so
       JOIN orders o ON so.order_id = o.id
       JOIN users u ON o.buyer_id = u.id
       WHERE so.id = ? AND so.seller_id = ?`,
      [id, seller.id]
    );

    if (subOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not authorized for this seller.'
      });
    }

    const subOrder = subOrders[0];

    // Fetch items belonging specifically to this sub-order
    const [items] = await pool.query(
      `SELECT 
         oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.subtotal,
         p.title as product_title, p.unit as product_unit, p.category,
         (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as product_image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.seller_order_id = ?`,
      [subOrder.seller_order_id]
    );

    return res.json({
      success: true,
      data: {
        ...subOrder,
        items
      }
    });
  } catch (error) {
    console.error('Error fetching seller order detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order detail.' });
  }
};

/**
 * Update Seller Sub-Order Fulfillment Status
 * Enforces strict state machine transitions:
 * - PENDING -> CONFIRMED | CANCELLED
 * - CONFIRMED -> PROCESSING | CANCELLED
 * - PROCESSING -> SHIPPED (Delivery) | READY_FOR_PICKUP (Pickup) | CANCELLED
 * - SHIPPED -> DELIVERED (Transitions COD to PAID)
 * - READY_FOR_PICKUP -> PICKED_UP (Transitions Farm Pickup to PAID)
 * - Terminal states (DELIVERED, PICKED_UP, CANCELLED) cannot transition further
 */
const updateSellerOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const [subOrders] = await pool.query(
      'SELECT id, order_id, status, fulfillment_method, payment_method, subtotal, delivery_fee FROM seller_orders WHERE id = ? AND seller_id = ?',
      [id, seller.id]
    );

    if (subOrders.length === 0) {
      return res.status(404).json({ success: false, message: 'Sub-order not found or not authorized for this seller.' });
    }

    const subOrder = subOrders[0];
    const currentStatus = subOrder.status;
    const fulfillmentMethod = (subOrder.fulfillment_method || 'DELIVERY').toUpperCase();

    // Define valid state transitions
    const allowedTransitions = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PROCESSING', 'CANCELLED'],
      'PROCESSING': fulfillmentMethod === 'PICKUP' ? ['READY_FOR_PICKUP', 'CANCELLED'] : ['SHIPPED', 'CANCELLED'],
      'READY_FOR_PICKUP': ['PICKED_UP'],
      'SHIPPED': ['DELIVERED'],
      'DELIVERED': [],
      'PICKED_UP': [],
      'CANCELLED': []
    };

    // Tolerate READY_FOR_PICKUP or SHIPPED if fulfillment allows
    if (currentStatus === 'PROCESSING') {
      if (!allowedTransitions['PROCESSING'].includes(status) && (status === 'READY_FOR_PICKUP' || status === 'SHIPPED')) {
        allowedTransitions['PROCESSING'].push(status);
      }
    }

    const validNext = allowedTransitions[currentStatus] || [];

    if (!validNext.includes(status)) {
      if (['DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(currentStatus)) {
        return res.status(400).json({
          success: false,
          message: `Order is already in terminal state "${currentStatus}" and cannot be transitioned further.`
        });
      }
      return res.status(400).json({
        success: false,
        message: `Invalid order status transition from "${currentStatus}" to "${status}". Allowed transitions: [${validNext.join(', ')}]`
      });
    }

    const orderTotal = parseFloat(subOrder.subtotal) + parseFloat(subOrder.delivery_fee || 0);

    // If order reaches terminal completion (DELIVERED for COD or PICKED_UP for Farm Pickup), cash is collected
    const isCompleted = status === 'DELIVERED' || status === 'PICKED_UP';

    if (isCompleted) {
      await pool.query(
        `UPDATE seller_orders 
         SET status = ?, payment_status = 'PAID', amount_paid = ?, amount_remaining = 0.00, updated_at = NOW() 
         WHERE id = ?`,
        [status, orderTotal, id]
      );
    } else {
      await pool.query(
        'UPDATE seller_orders SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, id]
      );
    }

    // Check sibling orders to update parent order status
    const [siblings] = await pool.query(
      'SELECT id, status, payment_status, subtotal, delivery_fee FROM seller_orders WHERE order_id = ?',
      [subOrder.order_id]
    );

    const allFinished = siblings.every(s => ['DELIVERED', 'PICKED_UP', 'CANCELLED'].includes(s.status));
    const allPaid = siblings.filter(s => s.status !== 'CANCELLED').every(s => s.payment_status === 'PAID');

    if (allPaid && siblings.some(s => s.status !== 'CANCELLED')) {
      await pool.query(
        `UPDATE orders 
         SET payment_status = 'PAID', amount_paid = total_amount, amount_remaining = 0.00, updated_at = NOW() 
         WHERE id = ?`,
        [subOrder.order_id]
      );
      await pool.query(
        'UPDATE payments SET status = "PAID", amount_paid = amount, amount_remaining = 0.00, updated_at = NOW() WHERE order_id = ?',
        [subOrder.order_id]
      );
    }

    if (allFinished) {
      const parentNewStatus = siblings.some(s => ['DELIVERED', 'PICKED_UP'].includes(s.status)) ? 'DELIVERED' : 'CANCELLED';
      await pool.query(
        'UPDATE orders SET order_status = ?, updated_at = NOW() WHERE id = ?',
        [parentNewStatus, subOrder.order_id]
      );
    }

    return res.json({
      success: true,
      message: isCompleted
        ? `Order status updated to ${status}. Cash payment marked as PAID (Collected).`
        : `Order status updated to ${status}.`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
};

/**
 * Update Seller Sub-Order Manual Payment Status (COD Collection)
 * Supported statuses: 'UNPAID', 'PARTIALLY_PAID', 'PAID'
 */
const updateSellerOrderPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, amount_paid } = req.body;
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const validPaymentStatuses = ['UNPAID', 'PAID'];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Must be one of [${validPaymentStatuses.join(', ')}]`
      });
    }

    const [subOrders] = await pool.query(
      'SELECT id, order_id, subtotal, delivery_fee FROM seller_orders WHERE id = ? AND seller_id = ?',
      [id, seller.id]
    );

    if (subOrders.length === 0) {
      return res.status(404).json({ success: false, message: 'Sub-order not found or not authorized for this seller.' });
    }

    const subOrder = subOrders[0];
    const orderTotal = parseFloat(subOrder.subtotal) + parseFloat(subOrder.delivery_fee || 0);

    const resolvedPaid = payment_status === 'PAID' ? orderTotal : 0.00;
    const resolvedRemaining = Math.max(0, orderTotal - resolvedPaid);

    await pool.query(
      `UPDATE seller_orders 
       SET payment_status = ?, amount_due = ?, amount_paid = ?, amount_remaining = ?, updated_at = NOW() 
       WHERE id = ?`,
      [payment_status, orderTotal, resolvedPaid, resolvedRemaining, id]
    );

    // Synchronize parent order payment status
    const [siblingOrders] = await pool.query(
      'SELECT payment_status, amount_paid, amount_due FROM seller_orders WHERE order_id = ?',
      [subOrder.order_id]
    );

    const allPaid = siblingOrders.every(s => s.payment_status === 'PAID');
    const totalParentPaid = siblingOrders.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0);
    const parentStatus = allPaid ? 'PAID' : 'UNPAID';

    await pool.query(
      'UPDATE orders SET payment_status = ?, amount_paid = ?, amount_remaining = GREATEST(0, total_amount - ?), updated_at = NOW() WHERE id = ?',
      [parentStatus, totalParentPaid, totalParentPaid, subOrder.order_id]
    );

    await pool.query(
      'UPDATE payments SET status = ?, amount_paid = ?, amount_remaining = GREATEST(0, amount - ?), updated_at = NOW() WHERE order_id = ?',
      [parentStatus, totalParentPaid, totalParentPaid, subOrder.order_id]
    );

    return res.json({
      success: true,
      message: `Cash on Delivery payment status updated to ${payment_status}.`,
      data: {
        sellerOrderId: id,
        paymentStatus: payment_status,
        amountPaid: resolvedPaid,
        amountRemaining: resolvedRemaining,
        parentPaymentStatus: parentStatus
      }
    });
  } catch (error) {
    console.error('Error updating order payment status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update payment status.' });
  }
};

/**
 * Get and Update Farm Profile
 */
const getSellerProfile = async (req, res) => {
  try {
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }
    return res.json({ success: true, data: seller });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load profile.' });
  }
};

const updateSellerProfile = async (req, res) => {
  try {
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const {
      farm_name,
      phone,
      address,
      province,
      district,
      tehsil,
      village,
      city,
      region,
      latitude,
      longitude,
      seller_declared_area_acres,
      calculated_polygon_area_acres,
      farm_polygon,
      logo_url,
      profile_image,
      bio,
      business_info,
      delivery_available,
      pickup_available,
      estimated_delivery_min_days,
      estimated_delivery_max_days,
      delivery_fee,
      pickup_instructions,
      payout_method,
      payout_account_title,
      payout_account_number,
      payout_bank_name
    } = req.body;

    const resolvedVillage = village !== undefined ? village : req.body.locality;
    const resolvedDeclaredAcreage = seller_declared_area_acres !== undefined ? seller_declared_area_acres : req.body.declared_acreage;
    const resolvedCalculatedAcreage = calculated_polygon_area_acres !== undefined ? calculated_polygon_area_acres : req.body.calculated_acreage;

    let normalizedPayoutMethod = payout_method ? payout_method.toUpperCase() : null;
    if (normalizedPayoutMethod === 'BANK') {
      normalizedPayoutMethod = 'BANK_ACCOUNT';
    }

    let reverificationRequired = false;

    // Check sensitive fields modification if seller is already APPROVED
    if (seller.approval_status === 'APPROVED') {
      if (farm_name && farm_name !== seller.farm_name) {
        await pool.query(
          `INSERT INTO seller_profile_audits (seller_id, changed_by, field_name, old_value, new_value, triggered_reverification)
           VALUES (?, ?, 'farm_name', ?, ?, TRUE)`,
          [seller.id, req.user.id, seller.farm_name, farm_name]
        );
        reverificationRequired = true;
      }

      if (payout_account_number && payout_account_number !== seller.payout_account_number) {
        await pool.query(
          `INSERT INTO seller_profile_audits (seller_id, changed_by, field_name, old_value, new_value, triggered_reverification)
           VALUES (?, ?, 'payout_account_number', ?, ?, TRUE)`,
          [seller.id, req.user.id, seller.payout_account_number ? 'REDACTED_PREVIOUS' : 'NONE', payout_account_number]
        );
        reverificationRequired = true;
      }
    }

    const targetApprovalStatus = reverificationRequired ? 'REVIEW_REQUIRED' : seller.approval_status;

    await pool.query(
      `UPDATE sellers 
       SET farm_name = COALESCE(?, farm_name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           province = COALESCE(?, province),
           district = COALESCE(?, district),
           tehsil = COALESCE(?, tehsil),
           village = COALESCE(?, village),
           city = COALESCE(?, city),
           region = COALESCE(?, region),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude),
           seller_declared_area_acres = COALESCE(?, seller_declared_area_acres),
           calculated_polygon_area_acres = COALESCE(?, calculated_polygon_area_acres),
           farm_polygon = COALESCE(?, farm_polygon),
           logo_url = COALESCE(?, logo_url),
           profile_image = COALESCE(?, profile_image),
           bio = COALESCE(?, bio),
           business_info = COALESCE(?, business_info),
           delivery_available = COALESCE(?, delivery_available),
           pickup_available = COALESCE(?, pickup_available),
           estimated_delivery_min_days = COALESCE(?, estimated_delivery_min_days),
           estimated_delivery_max_days = COALESCE(?, estimated_delivery_max_days),
           delivery_fee = COALESCE(?, delivery_fee),
           pickup_instructions = COALESCE(?, pickup_instructions),
           payout_method = COALESCE(?, payout_method),
           payout_account_title = COALESCE(?, payout_account_title),
           payout_account_number = COALESCE(?, payout_account_number),
           payout_bank_name = COALESCE(?, payout_bank_name),
           approval_status = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        farm_name || null,
        phone || null,
        address || null,
        province || null,
        district || null,
        tehsil || null,
        resolvedVillage || null,
        city || null,
        region || null,
        latitude !== undefined && latitude !== '' ? parseFloat(latitude) : null,
        longitude !== undefined && longitude !== '' ? parseFloat(longitude) : null,
        resolvedDeclaredAcreage !== undefined && resolvedDeclaredAcreage !== '' ? parseFloat(resolvedDeclaredAcreage) : null,
        resolvedCalculatedAcreage !== undefined && resolvedCalculatedAcreage !== '' ? parseFloat(resolvedCalculatedAcreage) : null,
        farm_polygon ? (typeof farm_polygon === 'string' ? farm_polygon : JSON.stringify(farm_polygon)) : null,
        logo_url || null,
        profile_image || null,
        bio || null,
        business_info || null,
        delivery_available !== undefined ? Boolean(delivery_available) : null,
        pickup_available !== undefined ? Boolean(pickup_available) : null,
        estimated_delivery_min_days !== undefined && estimated_delivery_min_days !== '' ? parseInt(estimated_delivery_min_days) : null,
        estimated_delivery_max_days !== undefined && estimated_delivery_max_days !== '' ? parseInt(estimated_delivery_max_days) : null,
        delivery_fee !== undefined && delivery_fee !== '' ? parseFloat(delivery_fee) : null,
        pickup_instructions || null,
        normalizedPayoutMethod || null,
        payout_account_title || null,
        payout_account_number || null,
        payout_bank_name || null,
        targetApprovalStatus,
        seller.id
      ]
    );

    const [updated] = await pool.query('SELECT * FROM sellers WHERE id = ?', [seller.id]);

    let responseMessage = 'Farm profile, boundary coordinates, and fulfillment settings updated successfully.';
    if (reverificationRequired) {
      responseMessage = 'Profile saved. Notice: Modifying verified farm legal title or bank payout details requires administrative re-verification.';
    }

    return res.json({
      success: true,
      message: responseMessage,
      reverificationRequired,
      data: updated[0]
    });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update farm profile.' });
  }
};

/**
 * Direct Media Upload for Seller Logos, Profile Images & Docs
 */
const uploadMediaFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No media file provided for upload.' });
    }

    const uploaded = await uploadMedia(req.file.path, {
      folder: 'kisanova_farm_media',
      resource_type: req.file.mimetype.startsWith('video') ? 'video' : 'image'
    });

    return res.json({
      success: true,
      data: {
        url: uploaded.url,
        format: uploaded.format
      }
    });
  } catch (error) {
    console.error('Upload media error:', error);
    return res.status(500).json({ success: false, message: 'Media upload failed: ' + error.message });
  }
};

module.exports = {
  getDashboardMetrics,
  getSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  updateSellerOrderPaymentStatus,
  getSellerProfile,
  updateSellerProfile,
  uploadMediaFile
};
