const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🌾 Kisanova API server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`🛡️  Role Authorization: Active [ADMIN, SELLER, BUYER]`);
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
