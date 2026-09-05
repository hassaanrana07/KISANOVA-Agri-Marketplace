const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const otpService = require('../services/otpService');

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
 * 1. Request Password Reset OTP (Email or Phone)
 */
const forgotPassword = async (req, res) => {
  try {
    const { identifier, portalRole } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered email address or mobile phone number.'
      });
    }

    const cleanIdentifier = identifier.trim();
    const isEmail = cleanIdentifier.includes('@');
    const phoneVariants = isEmail ? [] : otpService.getPhoneVariants(cleanIdentifier);

    // Uniform anti-enumeration response message
    const genericSuccessMessage = 'If an account exists for this email or phone number, a verification code has been sent.';

    // Find user by email or phone variants
    let users = [];
    if (isEmail) {
      const [resUsers] = await pool.query(
        'SELECT id, name, email, phone, role FROM users WHERE email = ?',
        [cleanIdentifier]
      );
      users = resUsers;
    } else {
      const [resUsers] = await pool.query(
        'SELECT id, name, email, phone, role FROM users WHERE phone IN (?)',
        [phoneVariants]
      );
      users = resUsers;
    }

    // Anti-user enumeration: Return generic message if user not found
    if (users.length === 0) {
      return res.json({
        success: true,
        message: genericSuccessMessage,
        data: {
          identifier: cleanIdentifier,
          channel: isEmail ? 'EMAIL' : 'SMS'
        }
      });
    }

    const user = users[0];

    // Enforce portal-specific role isolation if portalRole was supplied (anti-enumeration: return uniform response)
    if (portalRole && user.role !== portalRole.toUpperCase()) {
      return res.json({
        success: true,
        message: genericSuccessMessage,
        data: {
          identifier: cleanIdentifier,
          channel: isEmail ? 'EMAIL' : 'SMS'
        }
      });
    }

    // Rate Limiting: Check if an OTP was issued in the last 60 seconds
    const searchTargets = [user.email];
    if (user.phone) searchTargets.push(user.phone);
    if (!isEmail) searchTargets.push(...phoneVariants);

    const [recentRequests] = await pool.query(
      `SELECT created_at FROM password_resets 
       WHERE (email = ? OR phone IN (?)) AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
       LIMIT 1`,
      [user.email, searchTargets]
    );

    if (recentRequests.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'A verification code was recently generated. Please wait 60 seconds before requesting another code.'
      });
    }

    // Invalidate all previous unused OTPs for this user
    await pool.query(
      `UPDATE password_resets SET used = TRUE 
       WHERE (email = ? OR phone IN (?)) AND used = FALSE`,
      [user.email, searchTargets]
    );

    // Generate cryptographically secure 6-digit numeric OTP
    const otp = otpService.generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    // Save to password_resets table with 10-minute expiry
    await pool.query(
      `INSERT INTO password_resets (email, phone, otp_hash, expires_at, attempts, used)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0, FALSE)`,
      [user.email, user.phone || (isEmail ? null : cleanIdentifier), otpHash]
    );

    // Dispatch OTP via configured SMS or Brevo Email Gateway
    const dispatchResult = await otpService.dispatchOTP({
      identifier: isEmail ? user.email : (user.phone || cleanIdentifier),
      otp,
      channel: isEmail ? 'EMAIL' : 'SMS'
    });

    return res.json({
      success: true,
      message: genericSuccessMessage,
      data: {
        identifier: cleanIdentifier,
        channel: isEmail ? 'EMAIL' : 'SMS'
      }
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
 * 2. Verify Password Reset OTP
 * Generates and stores a cryptographically secure 32-byte reset token
 */
const verifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and 6-digit OTP code are required.'
      });
    }

    const cleanIdentifier = identifier.trim();
    const cleanOtp = otp.toString().trim();
    const isEmail = cleanIdentifier.includes('@');
    const phoneVariants = isEmail ? [] : otpService.getPhoneVariants(cleanIdentifier);

    // Fetch latest unused reset request for this identifier
    let records = [];
    if (isEmail) {
      const [emailRecords] = await pool.query(
        `SELECT * FROM password_resets 
         WHERE email = ? AND used = FALSE 
         ORDER BY created_at DESC LIMIT 1`,
        [cleanIdentifier]
      );
      records = emailRecords;
    } else {
      const [phoneRecords] = await pool.query(
        `SELECT * FROM password_resets 
         WHERE (phone IN (?) OR email = ?) AND used = FALSE 
         ORDER BY created_at DESC LIMIT 1`,
        [phoneVariants, cleanIdentifier]
      );
      records = phoneRecords;
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset request found. Please request a new code.'
      });
    }

    const resetRecord = records[0];

    // Check expiry
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'The verification code has expired. Please request a new code.'
      });
    }

    // Check attempt limit
    if (resetRecord.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    // Increment attempt count
    await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?', [resetRecord.id]);

    const isMatch = await bcrypt.compare(cleanOtp, resetRecord.otp_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${4 - resetRecord.attempts} attempt(s) remaining.`
      });
    }

    // Generate high-entropy 32-byte reset authorization token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save token hash with 15-minute validity window
    await pool.query(
      `UPDATE password_resets 
       SET reset_token_hash = ?, token_expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE) 
       WHERE id = ?`,
      [resetTokenHash, resetRecord.id]
    );

    return res.json({
      success: true,
      message: 'Verification code confirmed. You may now enter your new password.',
      resetToken,
      data: {
        resetToken
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying code.'
    });
  }
};

/**
 * 3. Reset Password with Reset Token (or verified OTP fallback)
 */
const resetPassword = async (req, res) => {
  try {
    const { identifier, resetToken, otp, newPassword } = req.body;

    if ((!identifier && !resetToken) || (!resetToken && !otp) || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset authorization token or code, and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    let cleanIdentifier = identifier ? identifier.trim() : null;
    let isEmail = cleanIdentifier ? cleanIdentifier.includes('@') : false;
    let phoneVariants = (cleanIdentifier && !isEmail) ? otpService.getPhoneVariants(cleanIdentifier) : [];

    let resetRecord = null;

    // A. Reset Token Authentication (Primary & High Security)
    if (resetToken && resetToken.trim().length > 0) {
      const hashedToken = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');

      const [tokenRecords] = await pool.query(
        `SELECT * FROM password_resets 
         WHERE reset_token_hash = ? AND used = FALSE 
         ORDER BY created_at DESC LIMIT 1`,
        [hashedToken]
      );

      if (tokenRecords.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or already used password reset token. Please request a new code.'
        });
      }

      resetRecord = tokenRecords[0];

      if (resetRecord.token_expires_at && new Date(resetRecord.token_expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Password reset authorization token has expired. Please request a new code.'
        });
      }
    } else {
      // B. OTP Fallback Verification (Backward Compatibility)
      const cleanOtp = otp.toString().trim();
      let records = [];
      if (isEmail) {
        const [emailRecords] = await pool.query(
          `SELECT * FROM password_resets 
           WHERE email = ? AND used = FALSE 
           ORDER BY created_at DESC LIMIT 1`,
          [cleanIdentifier]
        );
        records = emailRecords;
      } else {
        const [phoneRecords] = await pool.query(
          `SELECT * FROM password_resets 
           WHERE (phone IN (?) OR email = ?) AND used = FALSE 
           ORDER BY created_at DESC LIMIT 1`,
          [phoneVariants, cleanIdentifier]
        );
        records = phoneRecords;
      }

      if (records.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active password reset request found. Please request a new code.'
        });
      }

      resetRecord = records[0];

      if (new Date(resetRecord.expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'The verification code has expired. Please request a new code.'
        });
      }

      const isMatch = await bcrypt.compare(cleanOtp, resetRecord.otp_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code. Password reset aborted.'
        });
      }
    }

    // Invalidate reset record immediately
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = ?', [resetRecord.id]);

    // Hash new password and update user credentials
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const targetEmail = resetRecord.email || (cleanIdentifier && isEmail ? cleanIdentifier : null);
    const targetPhone = resetRecord.phone || (cleanIdentifier && !isEmail ? cleanIdentifier : null);

    if (targetEmail) {
      await pool.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE email = ?',
        [newPasswordHash, targetEmail]
      );
    } else if (targetPhone) {
      const pVariants = otpService.getPhoneVariants(targetPhone);
      await pool.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE phone IN (?) OR email = ?',
        [newPasswordHash, pVariants, targetPhone]
      );
    }

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
  verifyOtp,
  resetPassword
};

