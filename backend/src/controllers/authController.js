const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getJwtSecret } = require('../middleware/auth');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register User (Buyer or Seller)
 */
const register = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      farm_name,
      address,
      city,
      region,
      latitude,
      longitude,
      business_info,
      bio
    } = req.body;

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
      const {
        province,
        district,
        tehsil,
        village,
        seller_declared_area_acres,
        calculated_polygon_area_acres,
        farm_polygon,
        logo_url
      } = req.body;

      // New sellers are created with PENDING approval
      const [sellerResult] = await connection.query(
        `INSERT INTO sellers 
          (user_id, farm_name, phone, address, city, region, province, district, tehsil, village, 
           latitude, longitude, seller_declared_area_acres, calculated_polygon_area_acres, farm_polygon, 
           logo_url, business_info, bio, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
          userId,
          farm_name,
          phone,
          address,
          city || tehsil || null,
          region || province || null,
          province || null,
          district || null,
          tehsil || null,
          village || null,
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null,
          seller_declared_area_acres ? parseFloat(seller_declared_area_acres) : null,
          calculated_polygon_area_acres ? parseFloat(calculated_polygon_area_acres) : null,
          farm_polygon ? (typeof farm_polygon === 'string' ? farm_polygon : JSON.stringify(farm_polygon)) : null,
          logo_url || null,
          business_info || null,
          bio || null
        ]
      );
      sellerProfile = {
        id: sellerResult.insertId,
        farm_name,
        phone,
        address,
        province: province || null,
        district: district || null,
        tehsil: tehsil || null,
        village: village || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        seller_declared_area_acres: seller_declared_area_acres ? parseFloat(seller_declared_area_acres) : null,
        calculated_polygon_area_acres: calculated_polygon_area_acres ? parseFloat(calculated_polygon_area_acres) : null,
        farm_polygon: farm_polygon || null,
        logo_url: logo_url || null,
        approval_status: 'PENDING'
      };
    } else {
      // Create empty cart for buyer
      await connection.query('INSERT INTO carts (buyer_id) VALUES (?)', [userId]);
    }

    await connection.commit();

    const userObj = { id: userId, name, email, role: userRole, status: 'ACTIVE', phone };

    if (userRole === 'SELLER') {
      // Unverified seller does not get auto-login token; must wait for admin approval
      return res.status(201).json({
        success: true,
        message: 'Your seller account has been submitted successfully and is currently under review. You will be able to access the seller portal after your account has been verified by an administrator.',
        data: {
          user: userObj,
          seller: sellerProfile,
          status: 'PENDING'
        }
      });
    }

    // Buyer receives token for immediate shopping
    const token = generateToken(userObj);

    return res.status(201).json({
      success: true,
      message: 'Buyer account registered successfully.',
      data: {
        token,
        user: userObj,
        seller: null
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
    const email = (req.body.email || req.body.identifier || '').trim();
    const { password, requestedRole } = req.body;

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

    // Enforce Seller Verification checks on login
    let sellerProfile = null;
    if (user.role === 'SELLER') {
      const [sellers] = await pool.query(
        `SELECT id, user_id, farm_name, phone, address, city, region, latitude, longitude,
                business_info, profile_image, bio, approval_status, rejection_reason
         FROM sellers WHERE user_id = ?`,
        [user.id]
      );

      if (sellers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Seller profile record not found.'
        });
      }

      sellerProfile = sellers[0];

      // Unverified seller must NOT log in to the seller portal
      if (sellerProfile.approval_status === 'PENDING') {
        return res.status(403).json({
          success: false,
          message: 'Your seller account is still under verification. Please wait until an administrator approves your account.',
          status: 'PENDING'
        });
      }

      if (sellerProfile.approval_status === 'REJECTED') {
        return res.status(403).json({
          success: false,
          message: 'Your seller account was not approved. Please contact support or update your verification information if applicable.',
          status: 'REJECTED',
          rejectionReason: sellerProfile.rejection_reason || null
        });
      }

      if (sellerProfile.approval_status === 'SUSPENDED') {
        return res.status(403).json({
          success: false,
          message: 'Your seller account has been suspended. Please contact administrator.',
          status: 'SUSPENDED'
        });
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

/**
 * Request Password Reset Token (Email)
 * Anti-enumeration, generates secure 32-byte hex token, hashes with SHA-256
 */
const forgotPassword = async (req, res) => {
  try {
    const { email, identifier, portalRole } = req.body;
    const targetEmail = (email || identifier || '').trim();

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address.'
      });
    }

    // Anti-enumeration uniform message
    const genericSuccessMessage = 'If an account with that email exists, a password reset link has been generated.';

    // Look up user by email
    const [users] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = ?',
      [targetEmail]
    );

    // If user not found, return anti-enumeration generic message
    if (users.length === 0) {
      return res.json({
        success: true,
        message: genericSuccessMessage
      });
    }

    const user = users[0];

    // Enforce portal-specific role isolation if portalRole was supplied
    if (portalRole && user.role !== portalRole.toUpperCase()) {
      return res.json({
        success: true,
        message: genericSuccessMessage
      });
    }

    // Invalidate previous unused reset tokens for this user
    await pool.query(
      'UPDATE password_resets SET used = TRUE WHERE email = ? AND used = FALSE',
      [user.email]
    );

    // Generate cryptographically secure 32-byte hex token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save to password_resets table with 15-minute expiry
    await pool.query(
      `INSERT INTO password_resets (email, reset_token_hash, expires_at, token_expires_at, attempts, used)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, FALSE)`,
      [user.email, resetTokenHash]
    );

    // Determine reset link URL based on role / portal
    let clientBaseUrl = 'http://localhost:5000';
    if (user.role === 'SELLER' || portalRole === 'SELLER') {
      clientBaseUrl = 'http://localhost:5140';
    } else if (user.role === 'ADMIN' || portalRole === 'ADMIN') {
      clientBaseUrl = 'http://localhost:5174';
    }
    const devResetUrl = `${clientBaseUrl}/reset-password?token=${resetToken}`;

    console.log(`\n================================================================`);
    console.log(`🔑 [PASSWORD RESET TOKEN GENERATED]`);
    console.log(`User: ${user.email} (${user.role})`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Direct Reset URL: ${devResetUrl}`);
    console.log(`Expires in: 15 minutes`);
    console.log(`================================================================\n`);

    // In development/test mode, provide reset token/url to simplify local testing and frontend inspection
    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        success: true,
        message: genericSuccessMessage,
        isDevelopment: true,
        devResetUrl,
        devResetToken: resetToken
      });
    }

    // In production, do not expose token in response
    return res.json({
      success: true,
      message: genericSuccessMessage
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process password reset request.'
    });
  }
};

/**
 * Reset Password with 32-byte Reset Token
 */
const resetPassword = async (req, res) => {
  try {
    const token = (req.body.token || req.body.resetToken || '').trim();
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [tokenRecords] = await pool.query(
      `SELECT * FROM password_resets 
       WHERE reset_token_hash = ? AND used = FALSE 
       ORDER BY created_at DESC LIMIT 1`,
      [hashedToken]
    );

    if (tokenRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used password reset token.'
      });
    }

    const resetRecord = tokenRecords[0];
    const expiryDate = new Date(resetRecord.token_expires_at || resetRecord.expires_at);

    if (expiryDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'The password reset token has expired. Please request a new link.'
      });
    }

    // Invalidate reset token immediately (single-use)
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = ?', [resetRecord.id]);

    // Hash new password and update user record
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?',
      [newPasswordHash, resetRecord.email]
    );

    return res.json({
      success: true,
      message: 'Password reset successful! Please sign in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword
};

