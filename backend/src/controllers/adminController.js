const pool = require('../config/db');
const paymentService = require('../services/paymentService');

/**
 * Admin Dashboard Overview Metrics
 */
const getAdminMetrics = async (req, res) => {
  try {
    // 1. Core KPIs
    // Total Sellers & Pending Sellers
    const [sellerCounts] = await pool.query(
      `SELECT 
         COUNT(id) as total_sellers,
         COUNT(CASE WHEN approval_status = 'PENDING' THEN 1 END) as pending_sellers,
         COUNT(CASE WHEN approval_status = 'APPROVED' THEN 1 END) as approved_sellers
       FROM sellers`
    );

    // Total Buyers
    const [buyerCounts] = await pool.query(
      `SELECT COUNT(id) as total_buyers FROM users WHERE role = 'BUYER'`
    );

    // Products Stats
    const [productCounts] = await pool.query(
      `SELECT 
         COUNT(id) as total_products,
         COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_products,
         COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_products
       FROM products`
    );

    // Order & Revenue KPIs
    const [orderKpis] = await pool.query(
      `SELECT 
         COUNT(id) as total_orders,
         COUNT(CASE WHEN order_status = 'PENDING' THEN 1 END) as pending_orders,
         COUNT(CASE WHEN order_status = 'DELIVERED' THEN 1 END) as delivered_orders,
         COALESCE(SUM(total_amount), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE amount_paid END), 0) as paid_revenue,
         COALESCE(SUM(CASE WHEN payment_status = 'UNPAID' THEN total_amount WHEN payment_status = 'PARTIALLY_PAID' THEN (total_amount - amount_paid) ELSE 0 END), 0) as pending_revenue
       FROM orders`
    );

    // 2. Orders Timeline (Past 14 Days)
    const [timelineRows] = await pool.query(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m-%d') as date_label,
         COUNT(id) as orders_count,
         COALESCE(SUM(total_amount), 0) as revenue
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY date_label ASC`
    );

    // 3. Order Status Distribution
    const [orderStatuses] = await pool.query(
      `SELECT order_status as status, COUNT(id) as count 
       FROM orders 
       GROUP BY order_status 
       ORDER BY count DESC`
    );

    // 4. Payment Status Distribution
    const [paymentStatuses] = await pool.query(
      `SELECT 
         payment_status as status, 
         COUNT(id) as count,
         COALESCE(SUM(total_amount), 0) as volume
       FROM orders 
       GROUP BY payment_status 
       ORDER BY count DESC`
    );

    // 5. Product Category Distribution
    const [categories] = await pool.query(
      `SELECT category, COUNT(id) as count 
       FROM products 
       WHERE status = 'ACTIVE'
       GROUP BY category 
       ORDER BY count DESC`
    );

    // 6. Recent Orders across Marketplace
    const [recentOrders] = await pool.query(
      `SELECT 
         o.id, o.order_number, o.total_amount, o.delivery_name, o.payment_status,
         o.order_status, o.created_at, u.email as buyer_email,
         COUNT(DISTINCT so.seller_id) as sellers_count
       FROM orders o
       JOIN users u ON o.buyer_id = u.id
       LEFT JOIN seller_orders so ON o.id = so.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT 6`
    );

    return res.json({
      success: true,
      data: {
        kpis: {
          totalSellers: sellerCounts[0].total_sellers || 0,
          pendingSellers: sellerCounts[0].pending_sellers || 0,
          approvedSellers: sellerCounts[0].approved_sellers || 0,
          totalBuyers: buyerCounts[0].total_buyers || 0,
          totalProducts: productCounts[0].total_products || 0,
          activeProducts: productCounts[0].active_products || 0,
          pendingProducts: productCounts[0].pending_products || 0,
          totalOrders: orderKpis[0].total_orders || 0,
          pendingOrders: orderKpis[0].pending_orders || 0,
          deliveredOrders: orderKpis[0].delivered_orders || 0,
          totalRevenue: parseFloat(orderKpis[0].total_revenue || 0),
          paidRevenue: parseFloat(orderKpis[0].paid_revenue || 0),
          pendingRevenue: parseFloat(orderKpis[0].pending_revenue || 0)
        },
        ordersTimeline: timelineRows,
        orderStatusDistribution: orderStatuses,
        paymentStatusDistribution: paymentStatuses,
        categoryDistribution: categories,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admin metrics.' });
  }
};

/**
 * Get All Sellers with Filter
 */
const getSellers = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT 
        s.id, s.user_id, s.farm_name, s.phone, s.address, s.city, s.region,
        s.latitude, s.longitude, s.business_info, s.profile_image, s.bio,
        s.approval_status, s.rejection_reason, s.created_at,
        u.name as contact_name, u.email as contact_email, u.phone as contact_phone, u.status as user_status,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN p.id END) as active_products,
        COUNT(DISTINCT so.id) as total_orders
      FROM sellers s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON s.id = p.seller_id
      LEFT JOIN seller_orders so ON s.id = so.seller_id
    `;
    const params = [];
    const whereClauses = [];

    if (status && status !== 'ALL') {
      whereClauses.push('s.approval_status = ?');
      params.push(status);
    }

    if (search) {
      whereClauses.push('(s.farm_name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR s.city LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' GROUP BY s.id ORDER BY CASE WHEN s.approval_status = "PENDING" THEN 1 ELSE 2 END, s.created_at DESC';

    const [sellers] = await pool.query(query, params);

    return res.json({ success: true, data: sellers });
  } catch (error) {
    console.error('Error fetching sellers for admin:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sellers.' });
  }
};

/**
 * Update Seller Approval Status (APPROVED, REJECTED, SUSPENDED)
 */
const updateSellerApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const allowed = ['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: [${allowed.join(', ')}]`
      });
    }

    const [result] = await pool.query(
      'UPDATE sellers SET approval_status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?',
      [status, rejection_reason || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    // If seller is suspended or rejected, deactivate their products
    if (status === 'SUSPENDED' || status === 'REJECTED') {
      await pool.query(
        "UPDATE products SET status = 'INACTIVE' WHERE seller_id = ? AND status = 'ACTIVE'",
        [id]
      );
    }

    // If approved, reactivate products if seller was previously suspended
    if (status === 'APPROVED') {
      await pool.query(
        "UPDATE products SET status = 'ACTIVE' WHERE seller_id = ? AND status = 'INACTIVE'",
        [id]
      );
    }

    return res.json({
      success: true,
      message: `Seller status updated to ${status}.`
    });
  } catch (error) {
    console.error('Error updating seller approval:', error);
    return res.status(500).json({ success: false, message: 'Failed to update seller approval.' });
  }
};

/**
 * Get All Products for Moderation Queue
 */
const getAdminProducts = async (req, res) => {
  try {
    const { status, search, category } = req.query;
    let query = `
      SELECT 
        p.id, p.seller_id, p.title, p.category, p.crop_type, p.description,
        p.price, p.unit, p.available_quantity, p.status, p.created_at, p.updated_at,
        s.farm_name, s.approval_status as seller_approval,
        u.name as seller_name, u.email as seller_email,
        (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
      FROM products p
      JOIN sellers s ON p.seller_id = s.id
      JOIN users u ON s.user_id = u.id
    `;
    const params = [];
    const whereClauses = [];

    if (status && status !== 'ALL') {
      let normalizedStatus = status;
      if (status === 'APPROVED') normalizedStatus = 'ACTIVE';
      if (status === 'REJECTED') normalizedStatus = 'INACTIVE';
      whereClauses.push('p.status = ?');
      params.push(normalizedStatus);
    }

    if (category && category !== 'ALL') {
      whereClauses.push('p.category = ?');
      params.push(category);
    }

    if (search) {
      whereClauses.push('(p.title LIKE ? OR p.crop_type LIKE ? OR s.farm_name LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' ORDER BY p.created_at DESC';

    const [products] = await pool.query(query, params);

    return res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

/**
 * Update Product Status (APPROVED, REJECTED, INACTIVE)
 */
const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let normalizedStatus = status;
    if (status === 'APPROVED') normalizedStatus = 'ACTIVE';
    if (status === 'REJECTED') normalizedStatus = 'INACTIVE';

    const allowed = ['ACTIVE', 'INACTIVE'];
    if (!allowed.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: [${allowed.join(', ')}]`
      });
    }

    const [result] = await pool.query(
      'UPDATE products SET status = ?, updated_at = NOW() WHERE id = ?',
      [normalizedStatus, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.json({
      success: true,
      message: `Product status updated to ${status}.`
    });
  } catch (error) {
    console.error('Error updating product status:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product status.' });
  }
};

/**
 * Get All Marketplace Orders
 */
const getAdminOrders = async (req, res) => {
  try {
    const { payment_status, order_status, search } = req.query;

    let query = `
      SELECT 
        o.id, o.order_number, o.buyer_id, o.total_amount, o.delivery_name,
        o.delivery_phone, o.delivery_address, o.payment_status, o.order_status, o.created_at,
        u.name as buyer_name, u.email as buyer_email,
        p.id as payment_id, p.payment_provider, p.transaction_reference, p.proof_url, p.admin_notes,
        GROUP_CONCAT(DISTINCT s.farm_name SEPARATOR ', ') as involved_farms,
        COUNT(DISTINCT so.id) as seller_order_count
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      LEFT JOIN payments p ON o.id = p.order_id
      LEFT JOIN seller_orders so ON o.id = so.order_id
      LEFT JOIN sellers s ON so.seller_id = s.id
    `;
    const params = [];
    const whereClauses = [];

    if (payment_status && payment_status !== 'ALL') {
      whereClauses.push('o.payment_status = ?');
      params.push(payment_status);
    }

    if (order_status && order_status !== 'ALL') {
      whereClauses.push('o.order_status = ?');
      params.push(order_status);
    }

    if (search) {
      whereClauses.push('(o.order_number LIKE ? OR o.delivery_name LIKE ? OR u.email LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const [orders] = await pool.query(query, params);

    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

/**
 * Verify / Settle Manual Bank Transfer Payment
 */
const verifyBankTransfer = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { isApproved, adminNotes } = req.body;

    if (isApproved === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isApproved boolean is required.'
      });
    }

    const result = await paymentService.adminVerifyBankTransfer({
      paymentId: parseInt(paymentId),
      isApproved: Boolean(isApproved),
      adminNotes
    });

    return res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error verifying bank transfer:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify bank transfer.'
    });
  }
};

/**
 * Get Marketplace Users (Buyers & Sellers)
 */
const getUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;

    let query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.phone, u.created_at,
        s.farm_name, s.approval_status as seller_approval
      FROM users u
      LEFT JOIN sellers s ON u.id = s.user_id
    `;
    const params = [];
    const whereClauses = [];

    if (role && role !== 'ALL') {
      whereClauses.push('u.role = ?');
      params.push(role);
    }

    if (status && status !== 'ALL') {
      whereClauses.push('u.status = ?');
      params.push(status);
    }

    if (search) {
      whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' ORDER BY u.created_at DESC';

    const [users] = await pool.query(query, params);

    return res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

/**
 * Toggle User Account Status (ACTIVE, SUSPENDED)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'PENDING'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    // Do not allow suspending oneself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot suspend your own admin account.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: `User status changed to ${status}.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};

module.exports = {
  getAdminMetrics,
  getSellers,
  updateSellerApproval,
  getAdminProducts,
  updateProductStatus,
  getAdminOrders,
  verifyBankTransfer,
  getUsers,
  updateUserStatus
};
