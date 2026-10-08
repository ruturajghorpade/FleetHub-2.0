/**
 * FleetHub 2.0 - In-Memory Rate Limiting Middleware
 * Zero-dependency sliding-window rate limiter to protect authentication endpoints
 * against brute-force and credential stuffing attacks without impacting normal users.
 */

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  max = 50,                  // 50 requests per windowMs default
  message = 'Too many requests from this IP. Please try again later.',
} = {}) => {
  const store = new Map();

  // Periodic cleanup of expired entries every 5 minutes (unref prevents hanging process)
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now - record.startTime > windowMs) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  interval.unref();

  return (req, res, next) => {
    // Determine client identifier
    const clientIp =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    let record = store.get(clientIp);

    if (!record || now - record.startTime > windowMs) {
      record = {
        count: 1,
        startTime: now,
      };
      store.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const timeRemaining = Math.max(0, windowMs - (now - record.startTime));
    const resetTimeInSeconds = Math.ceil(timeRemaining / 1000);

    // Standard rate limit headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('RateLimit-Reset', resetTimeInSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetTimeInSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: resetTimeInSeconds,
      });
    }

    next();
  };
};

// Specifically tuned rate limiter for sensitive authentication endpoints (login, password change)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 50,                   // 50 attempts per 15 minutes per IP
  message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
});

module.exports = {
  createRateLimiter,
  authLimiter,
};
