const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { publicLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);

// Modern Recommended Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.secure || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Allowed origins for multi-application frontend architecture
const rawClientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim()) : [];
const configuredOrigins = new Set([
  process.env.PUBLIC_APP_URL || 'http://localhost:5000',
  process.env.SELLER_APP_URL || 'http://localhost:5140',
  process.env.ADMIN_APP_URL || 'http://localhost:5174',
  'http://localhost:5000',
  'http://localhost:5140',
  'http://localhost:5174',
  'http://localhost:5173',
  ...rawClientUrls
]);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or non-browser requests
    if (!origin) return callback(null, true);
    if (configuredOrigins.has(origin)) return callback(null, true);
    // In development mode, allow any localhost port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Secure static uploads serving with strict execution prevention
const allowedMediaExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm']);
const safeMimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

app.use('/uploads', (req, res, next) => {
  // Prevent directory traversal or null byte injections
  if (req.path.includes('..') || req.path.includes('\0')) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  // Strictly enforce extension whitelist: reject .php, .html, .js, .svg, or root directory access
  const ext = path.extname(req.path).toLowerCase();
  if (!allowedMediaExtensions.has(ext)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Direct access to non-media files is forbidden.'
    });
  }

  next();
}, express.static(path.join(__dirname, '../uploads'), {
  dotfiles: 'ignore',
  etag: true,
  index: false,
  setHeaders: (res, filePath) => {
    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Isolate document execution environment (sandboxed, zero script execution)
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const ext = path.extname(filePath).toLowerCase();
    if (safeMimeTypes[ext]) {
      res.setHeader('Content-Type', safeMimeTypes[ext]);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

// Health check endpoint (Moderate Public Rate Limit)
app.get('/api/health', publicLimiter, (req, res) => {
  res.json({
    success: true,
    service: 'Kisanova Agricultural Marketplace API',
    status: 'ONLINE',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', publicLimiter, productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handler (prevents stack traces & information leakage)
app.use(errorHandler);

module.exports = app;
