const path = require('path');
const pool = require('../backend/src/config/db');

async function hasColumn(connection, table, column) {
  const [cols] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  return cols.length > 0;
}

async function hasIndex(connection, table, indexName) {
  const [indexes] = await connection.query(`SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`, [indexName]);
  return indexes.length > 0;
}

async function migrate() {
  console.log('🌱 Starting Kisanova Migration V5 (Physical Payment Model & Password Resets Cleanup)...');
  const connection = await pool.getConnection();

  try {
    // 1. SELLERS TABLE
    console.log('1. Updating sellers table payout_method...');
    await connection.query("ALTER TABLE sellers MODIFY payout_method VARCHAR(50) DEFAULT 'BANK_ACCOUNT'");
    await connection.query("UPDATE sellers SET payout_method = 'BANK_ACCOUNT' WHERE payout_method IS NULL OR payout_method IN ('BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'SADAPAY')");

    // 2. ORDERS TABLE
    console.log('2. Updating orders table...');
    if (await hasColumn(connection, 'orders', 'online_provider')) {
      console.log('   Dropping orders.online_provider...');
      await connection.query('ALTER TABLE orders DROP COLUMN online_provider');
    }
    if (await hasColumn(connection, 'orders', 'transaction_reference')) {
      console.log('   Dropping orders.transaction_reference...');
      await connection.query('ALTER TABLE orders DROP COLUMN transaction_reference');
    }
    await connection.query("UPDATE orders SET payment_status = 'UNPAID' WHERE payment_status NOT IN ('UNPAID', 'PAID')");
    await connection.query("ALTER TABLE orders MODIFY payment_status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID'");

    // 3. SELLER_ORDERS TABLE
    console.log('3. Updating seller_orders table...');
    if (await hasColumn(connection, 'seller_orders', 'online_provider')) {
      console.log('   Dropping seller_orders.online_provider...');
      await connection.query('ALTER TABLE seller_orders DROP COLUMN online_provider');
    }
    if (await hasColumn(connection, 'seller_orders', 'transaction_reference')) {
      console.log('   Dropping seller_orders.transaction_reference...');
      await connection.query('ALTER TABLE seller_orders DROP COLUMN transaction_reference');
    }
    await connection.query("UPDATE seller_orders SET payment_status = 'UNPAID' WHERE payment_status NOT IN ('UNPAID', 'PAID')");
    await connection.query("ALTER TABLE seller_orders MODIFY payment_status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID'");

    // 4. PAYMENTS TABLE
    console.log('4. Updating payments table...');
    if (!await hasColumn(connection, 'payments', 'receipt_number')) {
      console.log('   Adding payments.receipt_number...');
      await connection.query('ALTER TABLE payments ADD COLUMN receipt_number VARCHAR(100) NULL AFTER payment_method');
      await connection.query("UPDATE payments SET receipt_number = CONCAT('REC-', order_id, '-', id) WHERE receipt_number IS NULL OR receipt_number = ''");
      await connection.query('ALTER TABLE payments MODIFY receipt_number VARCHAR(100) NOT NULL');
      await connection.query('ALTER TABLE payments ADD UNIQUE INDEX idx_payment_receipt (receipt_number)');
    }

    if (await hasColumn(connection, 'payments', 'payment_provider')) {
      console.log('   Dropping payments.payment_provider...');
      await connection.query('ALTER TABLE payments DROP COLUMN payment_provider');
    }
    if (await hasColumn(connection, 'payments', 'transaction_reference')) {
      console.log('   Dropping payments.transaction_reference...');
      if (await hasIndex(connection, 'payments', 'transaction_reference')) {
        await connection.query('ALTER TABLE payments DROP INDEX transaction_reference');
      }
      await connection.query('ALTER TABLE payments DROP COLUMN transaction_reference');
    }
    if (await hasColumn(connection, 'payments', 'webhook_payload')) {
      console.log('   Dropping payments.webhook_payload...');
      await connection.query('ALTER TABLE payments DROP COLUMN webhook_payload');
    }
    if (await hasColumn(connection, 'payments', 'refund_amount')) {
      console.log('   Dropping payments.refund_amount...');
      await connection.query('ALTER TABLE payments DROP COLUMN refund_amount');
    }
    if (await hasColumn(connection, 'payments', 'refund_reason')) {
      console.log('   Dropping payments.refund_reason...');
      await connection.query('ALTER TABLE payments DROP COLUMN refund_reason');
    }
    await connection.query("ALTER TABLE payments MODIFY status VARCHAR(50) NOT NULL DEFAULT 'UNPAID'");
    await connection.query("UPDATE payments SET status = 'UNPAID' WHERE status != 'PAID'");
    await connection.query("ALTER TABLE payments MODIFY status ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID'");

    // 5. PASSWORD RESETS TABLE
    console.log('5. Updating password_resets table...');
    if (await hasColumn(connection, 'password_resets', 'otp_hash')) {
      console.log('   Dropping password_resets.otp_hash...');
      await connection.query('ALTER TABLE password_resets DROP COLUMN otp_hash');
    }
    if (await hasColumn(connection, 'password_resets', 'expires_at')) {
      console.log('   Dropping password_resets.expires_at...');
      await connection.query('ALTER TABLE password_resets DROP COLUMN expires_at');
    }
    if (await hasColumn(connection, 'password_resets', 'phone')) {
      console.log('   Dropping password_resets.phone...');
      if (await hasIndex(connection, 'password_resets', 'idx_pwd_resets_phone')) {
        await connection.query('ALTER TABLE password_resets DROP INDEX idx_pwd_resets_phone');
      }
      await connection.query('ALTER TABLE password_resets DROP COLUMN phone');
    }
    if (!await hasColumn(connection, 'password_resets', 'reset_token_hash')) {
      console.log('   Adding password_resets.reset_token_hash...');
      await connection.query('ALTER TABLE password_resets ADD COLUMN reset_token_hash VARCHAR(64) NOT NULL AFTER email');
    }
    if (!await hasColumn(connection, 'password_resets', 'token_expires_at')) {
      console.log('   Adding password_resets.token_expires_at...');
      await connection.query('ALTER TABLE password_resets ADD COLUMN token_expires_at DATETIME NOT NULL AFTER reset_token_hash');
    }
    if (!await hasIndex(connection, 'password_resets', 'idx_pwd_resets_token_hash')) {
      console.log('   Adding index on password_resets(reset_token_hash)...');
      await connection.query('ALTER TABLE password_resets ADD INDEX idx_pwd_resets_token_hash (reset_token_hash)');
    }

    console.log('✅ Migration V5 completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
