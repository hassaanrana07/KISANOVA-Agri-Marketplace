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

    // Total sales revenue from seller_orders where payment was made
    const [salesResult] = await pool.query(
      `SELECT COALESCE(SUM(so.subtotal), 0) as total_revenue, COUNT(DISTINCT so.id) as total_orders
       FROM seller_orders so
       JOIN orders o ON so.order_id = o.id
       WHERE so.seller_id = ? AND o.payment_status = 'PAID'`,
      [seller.id]
    );

    // Order status counts
    const [orderStatusCounts] = await pool.query(
      `SELECT status, COUNT(id) as count
       FROM seller_orders
       WHERE seller_id = ?
       GROUP BY status`,
      [seller.id]
    );

    // Product status counts
    const [productCounts] = await pool.query(
      `SELECT status, COUNT(id) as count
       FROM products
       WHERE seller_id = ?
       GROUP BY status`,
      [seller.id]
    );

    // Recent orders for this seller
    const [recentOrders] = await pool.query(
      `SELECT 
         so.id as seller_order_id,
         so.order_id,
         o.order_number,
         o.created_at,
         so.subtotal,
         so.status as seller_status,
         o.payment_status,
         o.delivery_name,
         COUNT(oi.id) as items_count
       FROM seller_orders so
       JOIN orders o ON so.order_id = o.id
       LEFT JOIN order_items oi ON so.id = oi.seller_order_id
       WHERE so.seller_id = ?
       GROUP BY so.id
       ORDER BY o.created_at DESC
       LIMIT 5`,
      [seller.id]
    );

    return res.json({
      success: true,
      data: {
        seller,
        metrics: {
          totalRevenue: parseFloat(salesResult[0].total_revenue),
          totalOrders: salesResult[0].total_orders,
          orderStatusCounts,
          productCounts
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

    // Products created by sellers should initially be PENDING
    const [result] = await connection.query(
      `INSERT INTO products 
        (seller_id, title, category, crop_type, description, price, unit, available_quantity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
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
      message: 'Product created successfully. Awaiting Administrator approval.',
      data: {
        id: productId,
        title,
        status: 'PENDING'
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
       WHERE id = ?`,
      [
        title || null,
        category || null,
        crop_type || null,
        description || null,
        price ? parseFloat(price) : null,
        unit || null,
        available_quantity !== undefined ? parseFloat(available_quantity) : null,
        updatedStatus,
        id
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
        o.payment_status,
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
         o.payment_status,
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
      [id]
    );

    subOrder.items = items;

    return res.json({
      success: true,
      data: subOrder
    });
  } catch (error) {
    console.error('Error fetching seller order detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order detail.' });
  }
};

/**
 * Update Seller Order Status
 * Allowed: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
 */
const updateSellerOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const seller = await getSellerFromUser(req.user.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller profile not found.' });
    }

    const allowedStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: [${allowedStatuses.join(', ')}]`
      });
    }

    const [result] = await pool.query(
      'UPDATE seller_orders SET status = ?, updated_at = NOW() WHERE id = ? AND seller_id = ?',
      [status, id, seller.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not owned by this seller.'
      });
    }

    return res.json({
      success: true,
      message: `Order status updated to ${status}.`
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
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

    const { farm_name, phone, address, bio } = req.body;

    await pool.query(
      `UPDATE sellers 
       SET farm_name = COALESCE(?, farm_name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           bio = COALESCE(?, bio),
           updated_at = NOW()
       WHERE id = ?`,
      [farm_name, phone, address, bio, seller.id]
    );

    return res.json({
      success: true,
      message: 'Seller farm profile updated successfully.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
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
  getSellerProfile,
  updateSellerProfile
};
