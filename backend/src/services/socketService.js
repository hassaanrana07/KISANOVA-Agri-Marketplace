const { Server } = require('socket.io');

let ioInstance = null;

/**
 * Initialize Socket.IO with HTTP Server
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

  ioInstance.on('connection', (socket) => {
    // 1. Join user personal notification room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // 2. Join specific conversation room
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conv_${conversationId}`);
      }
    });

    // 3. Leave conversation room
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
