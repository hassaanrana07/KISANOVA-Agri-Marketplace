const pool = require('../config/db');
const paymentService = require('../services/paymentService');

/**
 * Admin Dashboard Overview Metrics
 */
const getAdminMetrics = async (req, res) => {
  try {
    // Total GMV (Gross Merchandise Value of paid orders)
    const [gmvResult] = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) as total_gmv, COUNT(id) as total_orders FROM orders WHERE payment_status = 'PAID'"
    );

    // Sellers count by approval status
    const [sellerStats] = await pool.query(
      'SELECT approval_status, COUNT(id) as count FROM sellers GROUP BY approval_status'
    );

    // Products count by status
    const [productStats] = await pool.query(
      'SELECT status, COUNT(id) as count FROM products GROUP BY status'
    );

    // Users count by role
    const [userStats] = await pool.query(
      'SELECT role, status, COUNT(id) as count FROM users GROUP BY role, status'
    );

    // Pending bank transfer payments count
    const [pendingPayments] = await pool.query(
      "SELECT COUNT(id) as pending_transfers FROM payments WHERE payment_provider = 'bank_transfer' AND status = 'PENDING'"
    );

    // Recent orders across marketplace
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
        totalGmv: parseFloat(gmvResult[0].total_gmv),
        totalOrders: gmvResult[0].total_orders,
        sellerStats,
        productStats,
        userStats,
        pendingTransfersCount: pendingPayments[0].pending_transfers,
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
        s.id, s.user_id, s.farm_name, s.phone, s.address, s.bio, s.approval_status, s.created_at,
        u.name as contact_name, u.email as contact_email, u.status as user_status,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT CASE WHEN p.status = 'APPROVED' THEN p.id END) as approved_products,
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
      whereClauses.push('(s.farm_name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ' GROUP BY s.id ORDER BY s.created_at DESC';

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
    const { status } = req.body;

    const allowed = ['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: [${allowed.join(', ')}]`
      });
    }

    const [result] = await pool.query(
      'UPDATE sellers SET approval_status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    // If seller is suspended/rejected, also deactivate their active products
    if (status === 'SUSPENDED' || status === 'REJECTED') {
      await pool.query(
        "UPDATE products SET status = 'INACTIVE' WHERE seller_id = ? AND status = 'APPROVED'",
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
      whereClauses.push('p.status = ?');
      params.push(status);
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

    query += ' ORDER BY CASE WHEN p.status = "PENDING" THEN 1 ELSE 2 END, p.created_at DESC';

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

    const allowed = ['APPROVED', 'REJECTED', 'INACTIVE', 'PENDING'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: [${allowed.join(', ')}]`
      });
    }

    const [result] = await pool.query(
      'UPDATE products SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
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
