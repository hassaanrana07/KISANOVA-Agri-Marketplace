/**
 * Rate Limiting Configuration
 * All thresholds, windows, and exponential backoff parameters are configurable
 * via environment variables with safe, production-grade defaults.
 */

const parseNumber = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
};

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1' || value === true;
};

const rateLimitConfig = {
  // Global switch to enable or disable rate limiting (can be bypassed in tests)
  get enabled() {
    return parseBoolean(process.env.RATE_LIMIT_ENABLED, true);
  },

  // Public endpoints (e.g. products catalog, health check, categories)
  public: {
    get windowMs() {
      return parseNumber(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 15 * 60 * 1000); // 15 minutes
    },
    get max() {
      return parseNumber(process.env.RATE_LIMIT_PUBLIC_MAX, 300); // 300 requests per window
    },
    message: 'Too many requests to public endpoints from this IP. Please try again later.'
  },

  // Authenticated user actions (e.g. cart, orders, seller/admin management, chat)
  authenticated: {
    get windowMs() {
      return parseNumber(process.env.RATE_LIMIT_AUTHED_WINDOW_MS, 15 * 60 * 1000); // 15 minutes
    },
    get max() {
      return parseNumber(process.env.RATE_LIMIT_AUTHED_MAX, 1500); // 1500 requests per window
    },
    message: 'Too many requests from this user account. Please slow down.'
  },

  // Authentication endpoints (login, register, password reset, email verification)
  auth: {
    // Per-IP request limit window and max requests
    get ipWindowMs() {
      return parseNumber(process.env.RATE_LIMIT_AUTH_IP_WINDOW_MS, 15 * 60 * 1000); // 15 minutes
    },
    get ipMax() {
      return parseNumber(process.env.RATE_LIMIT_AUTH_IP_MAX, 20); // 20 attempts per 15 min per IP
    },

    // Per-Account sliding window and maximum failure threshold before exponential backoff
    get accountWindowMs() {
      return parseNumber(process.env.RATE_LIMIT_AUTH_ACCOUNT_WINDOW_MS, 15 * 60 * 1000); // 15 minutes
    },
    get accountMaxAttempts() {
      return parseNumber(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX_ATTEMPTS, 5); // 5 attempts before backoff
    },

    // Exponential backoff parameters
    get backoffBaseMs() {
      return parseNumber(process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_MS, 2000); // Base backoff: 2 seconds
    },
    get backoffFactor() {
      return parseNumber(process.env.RATE_LIMIT_AUTH_BACKOFF_FACTOR, 2); // Factor: 2x multiplier per failure
    },
    get backoffMaxMs() {
      return parseNumber(process.env.RATE_LIMIT_AUTH_BACKOFF_MAX_MS, 15 * 60 * 1000); // Max delay: 15 minutes
    },

    // Password reset specific
    get passwordResetWindowMs() {
      return parseNumber(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS, 15 * 60 * 1000); // 15 minutes
    },
    get passwordResetMax() {
      return parseNumber(process.env.RATE_LIMIT_PASSWORD_RESET_MAX, 5); // 5 password reset requests per 15 min
    },

    // Resend email verification
    get resendVerificationWindowMs() {
      return parseNumber(process.env.RATE_LIMIT_RESEND_VERIFICATION_WINDOW_MS, 60 * 1000); // 60 seconds
    },
    get resendVerificationMax() {
      return parseNumber(process.env.RATE_LIMIT_RESEND_VERIFICATION_MAX, 2); // 2 resend requests per minute
    },

    // Verify email attempts
    get verifyEmailWindowMs() {
      return parseNumber(process.env.RATE_LIMIT_VERIFY_EMAIL_WINDOW_MS, 15 * 60 * 1000); // 15 minutes
    },
    get verifyEmailMax() {
      return parseNumber(process.env.RATE_LIMIT_VERIFY_EMAIL_MAX, 10); // 10 attempts per 15 min
    }
  }
};

module.exports = rateLimitConfig;
