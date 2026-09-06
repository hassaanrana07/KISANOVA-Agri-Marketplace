const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getJwtSecret } = require('../middleware/auth');

let ioInstance = null;

/**
 * Initialize Socket.IO with HTTP Server and Security Hardening
 */
const initSocket = (httpServer) => {
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

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (configuredOrigins.has(origin)) return callback(null, true);
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
    pingTimeout: 60000
  });

  // Socket.IO Handshake Authentication Middleware
  ioInstance.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!rawToken) {
        return next(new Error('Authentication error: Token required for WebSocket connection.'));
      }

      const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });

      const [users] = await pool.query(
        'SELECT id, name, email, role, status FROM users WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        return next(new Error('Authentication error: User no longer exists.'));
      }

      const user = users[0];
      if (user.status === 'SUSPENDED') {
        return next(new Error('Authentication error: Account suspended.'));
      }

      socket.user = user;

      // If seller, attach seller record
      if (user.role === 'SELLER') {
        const [sellers] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [user.id]);
        if (sellers.length > 0) {
          socket.seller = sellers[0];
        }
      }

      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  ioInstance.on('connection', (socket) => {
    // Automatically join the authenticated user's private personal notification room
    if (socket.user && socket.user.id) {
      socket.join(`user_${socket.user.id}`);
    }

    // Client join_user event: verify ownership before joining
    socket.on('join_user', (userId) => {
      if (userId && Number(userId) === Number(socket.user.id)) {
        socket.join(`user_${userId}`);
      }
    });

    // Join specific conversation room with authorization check
    socket.on('join_conversation', async (conversationId) => {
      try {
        if (!conversationId) return;

        // Admin can join any conversation for monitoring
        if (socket.user.role === 'ADMIN') {
          socket.join(`conv_${conversationId}`);
          return;
        }

        // Query conversation participants
        const [conversations] = await pool.query(
          `SELECT c.id, c.buyer_id, c.seller_id, s.user_id as seller_user_id
           FROM conversations c
           LEFT JOIN sellers s ON c.seller_id = s.id
           WHERE c.id = ?`,
          [conversationId]
        );

        if (conversations.length === 0) {
          socket.emit('error', { message: 'Conversation not found.' });
          return;
        }

        const conv = conversations[0];
        const isBuyer = Number(socket.user.id) === Number(conv.buyer_id);
        const isSeller = Number(socket.user.id) === Number(conv.seller_user_id);

        if (isBuyer || isSeller) {
          socket.join(`conv_${conversationId}`);
        } else {
          socket.emit('error', { message: 'Unauthorized: You are not a participant in this conversation.' });
        }
      } catch (err) {
        console.error('Socket join_conversation error:', err);
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conv_${conversationId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return ioInstance;
};

/**
 * Get active Socket.IO instance
 */
const getIO = () => {
  return ioInstance;
};

/**
 * Emit real-time event to a specific user
 */
const emitToUser = (userId, event, data) => {
  if (ioInstance && userId) {
    ioInstance.to(`user_${userId}`).emit(event, data);
  }
};

/**
 * Emit real-time event to an active conversation thread
 */
const emitToConversation = (conversationId, event, data) => {
  if (ioInstance && conversationId) {
    ioInstance.to(`conv_${conversationId}`).emit(event, data);
  }
};

/**
 * Broadcast event to all connected clients
 */
const broadcast = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToConversation,
  broadcast
};
