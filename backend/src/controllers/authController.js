const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'kisanova_ultra_secure_jwt_secret_key_2026_farmers_market',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register User (Buyer or Seller)
 */
const register = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name, email, password, phone, role, farm_name, address, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    // Role check: Only BUYER or SELLER can self-register. ADMIN cannot be self-registered.
    const userRole = role === 'SELLER' ? 'SELLER' : 'BUYER';

    if (userRole === 'SELLER' && (!farm_name || !address || !phone)) {
      return res.status(400).json({
        success: false,
        message: 'Farm/business name, phone, and address are required for seller registration.'
      });
    }

    // Check if email already exists
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    await connection.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, password_hash, role, status, phone)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
      [name, email, passwordHash, userRole, phone || null]
    );

    const userId = userResult.insertId;
    let sellerProfile = null;

    if (userRole === 'SELLER') {
      // New sellers are created with PENDING approval
      const [sellerResult] = await connection.query(
        `INSERT INTO sellers (user_id, farm_name, phone, address, bio, approval_status)
         VALUES (?, ?, ?, ?, ?, 'PENDING')`,
        [userId, farm_name, phone, address, bio || null]
      );
      sellerProfile = {
        id: sellerResult.insertId,
        farm_name,
        phone,
        address,
        bio: bio || null,
        approval_status: 'PENDING'
      };
    } else {
      // Create empty cart for buyer
      await connection.query('INSERT INTO carts (buyer_id) VALUES (?)', [userId]);
    }

    await connection.commit();

    const userObj = { id: userId, name, email, role: userRole, status: 'ACTIVE', phone };
    const token = generateToken(userObj);

    return res.status(201).json({
      success: true,
      message: userRole === 'SELLER'
        ? 'Seller account registered successfully. Verification status: PENDING.'
        : 'Buyer account registered successfully.',
      data: {
        token,
        user: userObj,
        seller: sellerProfile
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register account.',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Login User
 */
const login = async (req, res) => {
  try {
    const { email, password, requestedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const [users] = await pool.query(
      'SELECT id, name, email, password_hash, role, status, phone, avatar_url FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact Kisanova Support.'
      });
    }

    // Role check if user logged in via specific portal (e.g. /admin/login or /seller/login)
    if (requestedRole && user.role !== requestedRole) {
      return res.status(403).json({
        success: false,
        message: `This portal requires an ${requestedRole} account. Your account role is ${user.role}.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Fetch seller profile if applicable
    let sellerProfile = null;
    if (user.role === 'SELLER') {
      const [sellers] = await pool.query(
        'SELECT id, farm_name, phone, address, bio, approval_status FROM sellers WHERE user_id = ?',
        [user.id]
      );
      if (sellers.length > 0) {
        sellerProfile = sellers[0];
      }
    }

    const token = generateToken(user);
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      avatar_url: user.avatar_url
    };

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: sanitizedUser,
        seller: sellerProfile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
};

/**
 * Get Current User Profile
 */
const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        user: req.user,
        seller: req.seller || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.'
    });
  }
};

module.exports = {
  register,
  login,
  getMe
};
