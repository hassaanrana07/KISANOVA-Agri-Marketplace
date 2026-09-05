const pool = require('../backend/src/config/db');

async function migrateV3() {
  console.log('🌱 Starting Kisanova Database v3 Migration...');
  const connection = await pool.getConnection();

  try {
    // 1. Create notifications table
    console.log('📌 Creating notifications table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        seller_id INT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'NEW_ORDER',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255) NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_notifications_user (user_id),
        INDEX idx_notifications_unread (user_id, is_read)
      ) ENGINE=InnoDB;
    `);
    console.log('  ✓ notifications table ready');

    // 2. Create password_resets table
    console.log('📌 Creating password_resets table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NULL,
        phone VARCHAR(50) NULL,
        otp_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT DEFAULT 0,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pwd_resets_email (email),
        INDEX idx_pwd_resets_phone (phone)
      ) ENGINE=InnoDB;
    `);
    console.log('  ✓ password_resets table ready');

    // 3. Ensure payment_status has UNPAID in orders and seller_orders
    console.log('📌 Verifying payment_status enum in orders and seller_orders...');
    try {
      await connection.query(
        `ALTER TABLE orders MODIFY COLUMN payment_status 
         ENUM('UNPAID', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID'`
      );
      await connection.query(
        `ALTER TABLE seller_orders MODIFY COLUMN payment_status 
         ENUM('UNPAID', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID'`
      );
      console.log('  ✓ Default payment_status set to UNPAID');
    } catch (e) {
      console.warn('  ⚠️ Could not alter payment_status default:', e.message);
    }

    // 4. Seed initial notification for demo seller if empty
    const [existingNotifs] = await connection.query('SELECT COUNT(*) as count FROM notifications');
    if (existingNotifs[0].count === 0) {
      const [demoSellers] = await connection.query('SELECT id, user_id FROM sellers LIMIT 1');
      if (demoSellers.length > 0) {
        await connection.query(`
          INSERT INTO notifications (user_id, seller_id, type, title, message, link, is_read)
          VALUES (?, ?, 'SYSTEM', 'Welcome to Kisanova Real-Time Portal', 'Your farm dashboard is synchronized for Cash on Delivery orders and real-time alerts.', '/seller/orders', FALSE)
        `, [demoSellers[0].user_id, demoSellers[0].id]);
        console.log('  ✓ Demo seller notification seeded');
      }
    }

    console.log('✅ Migration v3 completed successfully!');
  } catch (error) {
    console.error('❌ Migration v3 failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrateV3();
