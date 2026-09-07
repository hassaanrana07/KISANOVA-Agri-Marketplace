const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const { initSocket } = require('./services/socketService');

const PORT = process.env.PORT || 5000;

// Create HTTP Server and bind Socket.IO
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`🌾 Kisanova API server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`🛡️  Role Authorization: Active [ADMIN, SELLER, BUYER]`);
  console.log(`⚡ Real-Time Socket.IO Server: Active`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

// Process-level unhandled exception & rejection handlers for server-side diagnostics
process.on('uncaughtException', (err) => {
  console.error('[FATAL UNCAUGHT EXCEPTION]', {
    timestamp: new Date().toISOString(),
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  // Terminate after logging fatal uncaught exception
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED PROMISE REJECTION]', {
    timestamp: new Date().toISOString(),
    reason: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason
  });
});

module.exports = { app, server, io };
