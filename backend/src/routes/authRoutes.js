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
  verifyEmailLimiter,
  authenticatedLimiter
} = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const {
  registerSchema,
  loginSchema,
  verifyEmailBodySchema,
  verifyEmailQuerySchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validators/authSchemas');

router.post('/register', authLimiter, validate({ body: registerSchema }), register);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.get('/me', requireAuth, authenticatedLimiter, getMe);

// Email Verification endpoints (30-min expiry, Brevo email dispatch, rate-limited)
router.post('/verify-email', verifyEmailLimiter, validate({ body: verifyEmailBodySchema }), verifyEmail);
router.get('/verify-email', verifyEmailLimiter, validate({ query: verifyEmailQuerySchema }), verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, validate({ body: resendVerificationSchema }), resendVerification);

// Password Reset endpoints (32-byte hex token, 15-min expiry, rate-limited)
router.post('/forgot-password', passwordResetLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate({ body: resetPasswordSchema }), resetPassword);

module.exports = router;
