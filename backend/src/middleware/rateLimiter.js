/**
 * ============================================================================
 * KISANOVA AGRI MARKETPLACE — ENTERPRISE MULTI-TIER RATE LIMITER
 * ============================================================================
 * 
 * Features:
 * 1. Stricter authentication limits with dual-key (per-IP + per-account) tracking
 *    and exponential backoff (avoids hard account lockouts).
 * 2. Moderate limits on public discovery endpoints (products catalog, health check).
 * 3. Looser limits on authenticated user actions (keyed by user ID).
 * 4. Fully configurable thresholds, windows, and backoff multipliers via env vars.
 * 5. RFC compliant headers (Retry-After, X-RateLimit-*).
 * 6. Memory-safe sliding window with automated pruning.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/rateLimitConfig');

/**
 * Safely extract the client IP address, supporting reverse proxies.
 */
const getClientIp = (req) => {
  if (!req) return '127.0.0.1';
  if (req.ip) return req.ip;

  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Extract an account identifier (email, phone, username) from the request.
 */
const getAccountIdentifier = (req) => {
  if (!req) return null;
  const raw =
    req.body?.email ||
    req.body?.identifier ||
    req.body?.phone ||
    req.query?.email ||
    req.user?.email ||
    null;

  if (raw && typeof raw === 'string') {
    return raw.trim().toLowerCase();
  }
  return null;
};

/**
 * Check if rate limiting should be bypassed (e.g. in test suites unless forced).
 */
const shouldBypassRateLimit = (req) => {
  if (!config.enabled) return true;
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_RATE_LIMIT) {
    return true;
  }
  return false;
};

/**
 * Generic Sliding Window Rate Limiter
 */
const createRateLimiter = ({
  windowMs = () => 15 * 60 * 1000,
  max = () => 100,
  keyGenerator = (req) => `ip:${getClientIp(req)}:${req.baseUrl || ''}${req.path || ''}`,
  message = 'Too many requests. Please try again later.',
  statusCode = 429
} = {}) => {
  const store = new Map();

  // Prune expired records every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const currentWindowMs = typeof windowMs === 'function' ? windowMs() : windowMs;
    for (const [key, record] of store.entries()) {
      if (now - record.startTime > currentWindowMs) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) cleanupInterval.unref();

  const middleware = (req, res, next) => {
    if (shouldBypassRateLimit(req)) {
      return next();
    }

    const currentWindowMs = typeof windowMs === 'function' ? windowMs() : windowMs;
    const currentMax = typeof max === 'function' ? max() : max;
    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);

    if (!record || now - record.startTime > currentWindowMs) {
      record = { count: 1, startTime: now };
      store.set(key, record);
    } else {
      record.count++;
    }

    const resetEpochSeconds = Math.ceil((record.startTime + currentWindowMs) / 1000);
    const remaining = Math.max(0, currentMax - record.count);

    res.setHeader('X-RateLimit-Limit', currentMax);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetEpochSeconds);

    if (record.count > currentMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.startTime + currentWindowMs - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(statusCode).json({
        success: false,
        message: typeof message === 'function' ? message(req) : message,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };

  middleware.resetKey = (key) => store.delete(key);
  middleware.resetAll = () => store.clear();
  middleware.getStore = () => store;

  return middleware;
};

/**
 * Multi-Tier Dual-Key Auth Rate Limiter with Exponential Backoff
 * 
 * - Dual-Key: Evaluates per-IP and per-Account independently.
 * - Exponential Backoff: Failed attempts progressively increase required wait time.
 * - No Hard Lockout: Legitimate users are not locked out for 24h; valid password clears failures.
 */
const createAuthBackoffLimiter = ({
  ipWindowMs = () => config.auth.ipWindowMs,
  ipMax = () => config.auth.ipMax,
  accountWindowMs = () => config.auth.accountWindowMs,
  accountMaxAttempts = () => config.auth.accountMaxAttempts,
  backoffBaseMs = () => config.auth.backoffBaseMs,
  backoffFactor = () => config.auth.backoffFactor,
  backoffMaxMs = () => config.auth.backoffMaxMs,
  scopeName = 'auth'
} = {}) => {
  const ipStore = new Map();
  const accountStore = new Map();

  // Prune expired records periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const curIpWindow = typeof ipWindowMs === 'function' ? ipWindowMs() : ipWindowMs;
    const curAccWindow = typeof accountWindowMs === 'function' ? accountWindowMs() : accountWindowMs;

    for (const [ip, record] of ipStore.entries()) {
      if (now - record.firstAttemptTime > curIpWindow && record.backoffUntil <= now) {
        ipStore.delete(ip);
      }
    }

    for (const [acc, record] of accountStore.entries()) {
      if (now - record.firstAttemptTime > curAccWindow && record.backoffUntil <= now) {
        accountStore.delete(acc);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) cleanupInterval.unref();

  const middleware = (req, res, next) => {
    if (shouldBypassRateLimit(req)) {
      return next();
    }

    const now = Date.now();
    const clientIp = getClientIp(req);
    const accountIdentifier = getAccountIdentifier(req);

    const curIpWindow = typeof ipWindowMs === 'function' ? ipWindowMs() : ipWindowMs;
    const curIpMax = typeof ipMax === 'function' ? ipMax() : ipMax;
    const curAccWindow = typeof accountWindowMs === 'function' ? accountWindowMs() : accountWindowMs;
    const curAccMaxAttempts = typeof accountMaxAttempts === 'function' ? accountMaxAttempts() : accountMaxAttempts;
    const curBaseMs = typeof backoffBaseMs === 'function' ? backoffBaseMs() : backoffBaseMs;
    const curFactor = typeof backoffFactor === 'function' ? backoffFactor() : backoffFactor;
    const curMaxMs = typeof backoffMaxMs === 'function' ? backoffMaxMs() : backoffMaxMs;

    // 1. Evaluate IP Store
    let ipRecord = ipStore.get(clientIp);
    if (!ipRecord || (now - ipRecord.firstAttemptTime > curIpWindow && ipRecord.backoffUntil <= now)) {
      ipRecord = {
        count: 0,
        consecutiveFailures: 0,
        firstAttemptTime: now,
        lastAttemptTime: now,
        backoffUntil: 0
      };
      ipStore.set(clientIp, ipRecord);
    }

    // Check if IP is in active exponential backoff
    if (ipRecord.backoffUntil > now) {
      const retryAfterSeconds = Math.max(1, Math.ceil((ipRecord.backoffUntil - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message: `Too many failed authentication attempts from this IP address. Please wait ${retryAfterSeconds} second(s) before trying again.`,
        retryAfter: retryAfterSeconds,
        backoff: true,
        scope: 'ip'
      });
    }

    // Check if IP exceeded overall window request limit
    if (ipRecord.count >= curIpMax) {
      const retryAfterSeconds = Math.max(1, Math.ceil((ipRecord.firstAttemptTime + curIpWindow - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message: `Too many authentication requests from this IP address. Please wait ${retryAfterSeconds} second(s) before trying again.`,
        retryAfter: retryAfterSeconds,
        scope: 'ip'
      });
    }

    // 2. Evaluate Account Store (if account identifier is present in request)
    let accountRecord = null;
    if (accountIdentifier) {
      accountRecord = accountStore.get(accountIdentifier);
      if (!accountRecord || (now - accountRecord.firstAttemptTime > curAccWindow && accountRecord.backoffUntil <= now)) {
        accountRecord = {
          count: 0,
          consecutiveFailures: 0,
          firstAttemptTime: now,
          lastAttemptTime: now,
          backoffUntil: 0
        };
        accountStore.set(accountIdentifier, accountRecord);
      }

      // Check if Account is in active exponential backoff
      if (accountRecord.backoffUntil > now) {
        const retryAfterSeconds = Math.max(1, Math.ceil((accountRecord.backoffUntil - now) / 1000));
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          success: false,
          message: `Too many failed attempts for account "${accountIdentifier}". Exponential backoff active. Please wait ${retryAfterSeconds} second(s) before trying again.`,
          retryAfter: retryAfterSeconds,
          backoff: true,
          scope: 'account'
        });
      }
    }

    // Request is allowed to proceed — register attempt counts
    ipRecord.count++;
    ipRecord.lastAttemptTime = now;
    if (accountRecord) {
      accountRecord.count++;
      accountRecord.lastAttemptTime = now;
    }

    // Set rate limit headers
    const remainingIpAttempts = Math.max(0, curIpMax - ipRecord.count);
    const resetEpochSeconds = Math.ceil((ipRecord.firstAttemptTime + curIpWindow) / 1000);
    res.setHeader('X-RateLimit-Limit', curIpMax);
    res.setHeader('X-RateLimit-Remaining', remainingIpAttempts);
    res.setHeader('X-RateLimit-Reset', resetEpochSeconds);

    // Listen to response finish to track authentication outcome
    res.on('finish', () => {
      const statusCode = res.statusCode;

      // SUCCESSFUL AUTHENTICATION: Reset consecutive failures and clear backoff
      if (statusCode >= 200 && statusCode < 300) {
        if (accountRecord) {
          accountRecord.consecutiveFailures = 0;
          accountRecord.backoffUntil = 0;
        }
        ipRecord.consecutiveFailures = Math.max(0, ipRecord.consecutiveFailures - 1);
        return;
      }

      // FAILED AUTHENTICATION (Invalid credentials, bad request, forbidden)
      // Exclude 429 to avoid double-penalizing already blocked requests
      if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
        const failureTime = Date.now();

        // 1. Update Account Failures & Exponential Backoff
        if (accountRecord) {
          accountRecord.consecutiveFailures++;
          if (accountRecord.consecutiveFailures >= curAccMaxAttempts) {
            const exponent = accountRecord.consecutiveFailures - curAccMaxAttempts;
            const delayMs = Math.min(
              curBaseMs * Math.pow(curFactor, exponent),
              curMaxMs
            );
            accountRecord.backoffUntil = failureTime + delayMs;
          }
        }

        // 2. Update IP Failures & Exponential Backoff (if IP exhibits brute-force behavior)
        ipRecord.consecutiveFailures++;
        if (ipRecord.consecutiveFailures >= curAccMaxAttempts * 2) {
          const exponent = ipRecord.consecutiveFailures - (curAccMaxAttempts * 2);
          const delayMs = Math.min(
            curBaseMs * Math.pow(curFactor, exponent),
            curMaxMs
          );
          ipRecord.backoffUntil = failureTime + delayMs;
        }
      }
    });

    next();
  };

  middleware.resetAccount = (account) => {
    if (!account) return;
    accountStore.delete(account.trim().toLowerCase());
  };

  middleware.resetIp = (ip) => {
    if (!ip) return;
    ipStore.delete(ip);
  };

  middleware.resetAll = () => {
    ipStore.clear();
    accountStore.clear();
  };

  middleware.getStores = () => ({ ipStore, accountStore });

  return middleware;
};

/**
 * Tier 1: Moderate Rate Limiter for Public Endpoints (Products, Health Check, Categories)
 */
const publicLimiter = createRateLimiter({
  windowMs: () => config.public.windowMs,
  max: () => config.public.max,
  keyGenerator: (req) => `public:${getClientIp(req)}`,
  message: config.public.message
});

/**
 * Tier 2: Looser Rate Limiter for Authenticated User Actions (Orders, Cart, Chat, Dashboard)
 * Keyed by authenticated User ID, with graceful fallback to client IP.
 */
const authenticatedLimiter = createRateLimiter({
  windowMs: () => config.authenticated.windowMs,
  max: () => config.authenticated.max,
  keyGenerator: (req) => {
    // 1. Direct authenticated user object
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    // 2. Decode JWT if header present before requireAuth executes
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.decode(token);
        if (decoded && decoded.id) {
          return `user:${decoded.id}`;
        }
      } catch (err) {
        // Fall back to IP on decode failure
      }
    }
    // 3. Fallback to client IP
    return `authed-ip:${getClientIp(req)}`;
  },
  message: config.authenticated.message
});

/**
 * Tier 3: Stricter Authentication Limiters with Exponential Backoff
 */

// Stricter limits on login and register routes
const authLimiter = createAuthBackoffLimiter({
  ipWindowMs: () => config.auth.ipWindowMs,
  ipMax: () => config.auth.ipMax,
  accountWindowMs: () => config.auth.accountWindowMs,
  accountMaxAttempts: () => config.auth.accountMaxAttempts,
  backoffBaseMs: () => config.auth.backoffBaseMs,
  backoffFactor: () => config.auth.backoffFactor,
  backoffMaxMs: () => config.auth.backoffMaxMs,
  scopeName: 'auth-login-register'
});

// Stricter limits on password reset (forgot & reset endpoints)
const passwordResetLimiter = createAuthBackoffLimiter({
  ipWindowMs: () => config.auth.passwordResetWindowMs,
  ipMax: () => config.auth.passwordResetMax,
  accountWindowMs: () => config.auth.passwordResetWindowMs,
  accountMaxAttempts: () => Math.min(3, config.auth.passwordResetMax),
  backoffBaseMs: () => config.auth.backoffBaseMs,
  backoffFactor: () => config.auth.backoffFactor,
  backoffMaxMs: () => config.auth.backoffMaxMs,
  scopeName: 'password-reset'
});

// Resend verification email limiter (1-2 per minute)
const resendVerificationLimiter = createRateLimiter({
  windowMs: () => config.auth.resendVerificationWindowMs,
  max: () => config.auth.resendVerificationMax,
  keyGenerator: (req) => {
    const acc = getAccountIdentifier(req);
    return acc ? `resend:${acc}` : `resend:${getClientIp(req)}`;
  },
  message: 'Please wait at least 60 seconds before requesting another verification email.'
});

// Email verification token check limiter
const verifyEmailLimiter = createRateLimiter({
  windowMs: () => config.auth.verifyEmailWindowMs,
  max: () => config.auth.verifyEmailMax,
  keyGenerator: (req) => `verify-email:${getClientIp(req)}`,
  message: 'Too many verification attempts. Please try again later.'
});

module.exports = {
  getClientIp,
  getAccountIdentifier,
  createRateLimiter,
  createAuthBackoffLimiter,
  publicLimiter,
  authenticatedLimiter,
  authLimiter,
  passwordResetLimiter,
  resendVerificationLimiter,
  verifyEmailLimiter
};
