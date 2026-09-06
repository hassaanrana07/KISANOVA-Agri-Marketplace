const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const {
  authLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
  verifyEmailLimiter
} = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', requireAuth, getMe);

// Email Verification endpoints (30-min expiry, Brevo email dispatch, rate-limited)
router.post('/verify-email', verifyEmailLimiter, verifyEmail);
router.get('/verify-email', verifyEmailLimiter, verifyEmail); // Support direct GET link verification as well
router.post('/resend-verification', resendVerificationLimiter, resendVerification);

// Password Reset endpoints (32-byte hex token, 15-min expiry, rate-limited)
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);

module.exports = router;
