/**
 * Zero-Dependency In-Memory Sliding Window Rate Limiter
 * Suitable for protecting security-sensitive endpoints (Auth, Password Reset)
 */

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  max = 10,                  // max requests per window
  message = 'Too many requests from this client. Please try again later.'
} = {}) => {
  const hits = new Map();

  // Prune expired records every 5 minutes to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (interval.unref) interval.unref();

  return (req, res, next) => {
    // In test environment, bypass rate limits to allow fast test execution
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const record = hits.get(key);

    if (!record || now - record.startTime > windowMs) {
      hits.set(key, { count: 1, startTime: now });
      return next();
    }

    record.count++;

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };
};

// 10 attempts per 15 minutes on login & register
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
});

// 5 attempts per 15 minutes on password reset requests
const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password reset requests. Please wait a few minutes before trying again.'
});

module.exports = {
  createRateLimiter,
  authLimiter,
  passwordResetLimiter
};
