const pool = require('../backend/src/config/db');

async function migrate() {
  console.log('🌱 Starting Kisanova Migration V4 (Farm Pickup, COD Status & Token Indexes)...');
  const connection = await pool.getConnection();

  try {
    // 1. Make delivery_address NULLABLE in orders (for Farm Pickup)
    console.log('1. Modifying orders.delivery_address to NULLABLE...');
    await connection.query('ALTER TABLE orders MODIFY delivery_address TEXT NULL');

    // 2. Expand payment_method in orders to support FARM_PICKUP & COD
    console.log('2. Modifying orders.payment_method to VARCHAR(50)...');
    await connection.query("ALTER TABLE orders MODIFY payment_method VARCHAR(50) NOT NULL DEFAULT 'COD'");

    // 3. Expand payment_method in seller_orders to support FARM_PICKUP & COD
    console.log('3. Modifying seller_orders.payment_method to VARCHAR(50)...');
    await connection.query("ALTER TABLE seller_orders MODIFY payment_method VARCHAR(50) NOT NULL DEFAULT 'COD'");

    // 4. Expand seller_orders.status to support READY_FOR_PICKUP & PICKED_UP
    console.log('4. Modifying seller_orders.status to VARCHAR(50)...');
    await connection.query("ALTER TABLE seller_orders MODIFY status VARCHAR(50) NOT NULL DEFAULT 'PENDING'");

    // 5. Expand orders.order_status to support READY_FOR_PICKUP & PICKED_UP
    console.log('5. Modifying orders.order_status to VARCHAR(50)...');
    await connection.query("ALTER TABLE orders MODIFY order_status VARCHAR(50) NOT NULL DEFAULT 'PENDING'");

    // 6. Ensure indexes on password_resets for token lookup
    console.log('6. Adding index on password_resets(reset_token_hash)...');
    try {
      await connection.query('CREATE INDEX idx_password_resets_token_hash ON password_resets(reset_token_hash)');
    } catch (idxErr) {
      if (!idxErr.message.includes('Duplicate key name')) {
        console.warn('  Index note:', idxErr.message);
      }
    }

    console.log('✅ Migration V4 completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
