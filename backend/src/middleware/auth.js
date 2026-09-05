const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Authentication Middleware
 * Validates JWT token and attaches user object to request
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kisanova_ultra_secure_jwt_secret_key_2026_farmers_market');

    // Query fresh user data from database
    const [users] = await pool.query(
      'SELECT id, name, email, role, status, phone, avatar_url FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.'
      });
    }

    const user = users[0];

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact administrator.'
      });
    }

    req.user = user;

    // If user is a seller, attach seller profile data
    if (user.role === 'SELLER') {
      const [sellers] = await pool.query(
        `SELECT id, user_id, farm_name, phone, address, city, region, latitude, longitude,
                business_info, profile_image, bio, approval_status, rejection_reason
         FROM sellers WHERE user_id = ?`,
        [user.id]
      );
      if (sellers.length > 0) {
        req.seller = sellers[0];
      }
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
};

/**
 * Role-Based Access Control Middleware
 * @param  {...string} roles Allowed roles ('ADMIN', 'SELLER', 'BUYER')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Protected endpoint requires one of the following roles: [${roles.join(', ')}]. Your role is ${req.user.role}.`
      });
    }

    next();
  };
};

/**
 * Require Administrator Privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }
  next();
};

/**
 * Require Approved Seller Middleware
 * Rejects unverified (PENDING), REJECTED, or SUSPENDED sellers
 */
const requireApprovedSeller = (req, res, next) => {
  if (!req.user || req.user.role !== 'SELLER') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Seller account required.'
    });
  }

  if (!req.seller || req.seller.approval_status !== 'APPROVED') {
    const status = req.seller?.approval_status || 'PENDING';
    const message = status === 'PENDING'
      ? 'Your seller account is still under verification. Please wait until an administrator approves your account.'
      : status === 'REJECTED'
      ? 'Your seller account was not approved. Please contact support or update your verification information if applicable.'
      : 'Your seller account has been suspended. Please contact administrator.';

    return res.status(403).json({
      success: false,
      message,
      status
    });
  }

  next();
};

/**
 * Require Buyer Privileges
 */
const requireBuyer = (req, res, next) => {
  if (!req.user || req.user.role !== 'BUYER') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Buyer account required.'
    });
  }
  next();
};

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireApprovedSeller,
  requireBuyer
};
