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

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection! Shutting down...', err);
});

module.exports = { app, server, io };
