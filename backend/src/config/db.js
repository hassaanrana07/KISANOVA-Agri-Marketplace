const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kisanova_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('📦 Connected to MySQL Database (kisanova_db)');
    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error.message);
  }
})();

module.exports = pool;
