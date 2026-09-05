const pool = require('../backend/src/config/db');

async function migrate() {
  console.log('🌱 Starting Kisanova Database v2 Migration...');
  const connection = await pool.getConnection();

  try {
    // Helper to check if column exists
    const columnExists = async (table, column) => {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as cnt FROM information_schema.columns 
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
      );
      return rows[0].cnt > 0;
    };

    // 1. Sellers Table Updates
    console.log('📌 Updating sellers table...');
    const sellerCols = [
      { name: 'province', type: 'VARCHAR(100) NULL' },
      { name: 'district', type: 'VARCHAR(100) NULL' },
      { name: 'tehsil', type: 'VARCHAR(100) NULL' },
      { name: 'village', type: 'VARCHAR(150) NULL' },
      { name: 'seller_declared_area_acres', type: 'DECIMAL(10, 2) NULL' },
      { name: 'calculated_polygon_area_acres', type: 'DECIMAL(10, 2) NULL' },
      { name: 'farm_polygon', type: 'JSON NULL' },
      { name: 'logo_url', type: 'VARCHAR(500) NULL' },
      { name: 'delivery_available', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'pickup_available', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'estimated_delivery_min_days', type: 'INT DEFAULT 2' },
      { name: 'estimated_delivery_max_days', type: 'INT DEFAULT 4' },
      { name: 'delivery_fee', type: 'DECIMAL(10, 2) DEFAULT 300.00' },
      { name: 'pickup_instructions', type: 'TEXT NULL' },
      { name: 'payout_method', type: "ENUM('BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'SADAPAY') DEFAULT 'BANK_TRANSFER'" },
      { name: 'payout_account_title', type: 'VARCHAR(150) NULL' },
      { name: 'payout_account_number', type: 'VARCHAR(100) NULL' },
      { name: 'payout_bank_name', type: 'VARCHAR(100) NULL' },
      { name: 'payout_status', type: "ENUM('UNCONFIGURED', 'PENDING_VERIFICATION', 'VERIFIED') DEFAULT 'UNCONFIGURED'" }
    ];

    for (const col of sellerCols) {
      if (!(await columnExists('sellers', col.name))) {
        await connection.query(`ALTER TABLE sellers ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  + Added sellers.${col.name}`);
      }
    }

    // Modify approval_status enum to include REVIEW_REQUIRED
    try {
      await connection.query(
        `ALTER TABLE sellers MODIFY COLUMN approval_status 
         ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVIEW_REQUIRED') NOT NULL DEFAULT 'PENDING'`
      );
      console.log('  ✓ Updated sellers.approval_status enum');
    } catch (e) {
      console.warn('  ⚠️  Could not modify approval_status enum:', e.message);
    }

    // 2. Orders Table Updates
    console.log('📌 Updating orders table...');
    const orderCols = [
      { name: 'currency', type: "VARCHAR(10) NOT NULL DEFAULT 'PKR'" },
      { name: 'fulfillment_method', type: "ENUM('DELIVERY', 'PICKUP') NOT NULL DEFAULT 'DELIVERY'" },
      { name: 'delivery_fee', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'estimated_delivery_min_days', type: 'INT NULL' },
      { name: 'estimated_delivery_max_days', type: 'INT NULL' },
      { name: 'pickup_instructions', type: 'TEXT NULL' },
      { name: 'amount_due', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'amount_paid', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'amount_remaining', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' }
    ];

    for (const col of orderCols) {
      if (!(await columnExists('orders', col.name))) {
        await connection.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  + Added orders.${col.name}`);
      }
    }

    try {
      await connection.query(
        `ALTER TABLE orders MODIFY COLUMN payment_status 
         ENUM('UNPAID', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING'`
      );
      console.log('  ✓ Updated orders.payment_status enum');
    } catch (e) {
      console.warn('  ⚠️  Could not modify orders.payment_status enum:', e.message);
    }

    // 3. Seller Orders Table Updates
    console.log('📌 Updating seller_orders table...');
    const sellerOrderCols = [
      { name: 'fulfillment_method', type: "ENUM('DELIVERY', 'PICKUP') NOT NULL DEFAULT 'DELIVERY'" },
      { name: 'delivery_fee', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'amount_due', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'amount_paid', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'amount_remaining', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' }
    ];

    for (const col of sellerOrderCols) {
      if (!(await columnExists('seller_orders', col.name))) {
        await connection.query(`ALTER TABLE seller_orders ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  + Added seller_orders.${col.name}`);
      }
    }

    try {
      await connection.query(
        `ALTER TABLE seller_orders MODIFY COLUMN payment_status 
         ENUM('UNPAID', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING'`
      );
      console.log('  ✓ Updated seller_orders.payment_status enum');
    } catch (e) {
      console.warn('  ⚠️  Could not modify seller_orders.payment_status enum:', e.message);
    }

    // 4. Payments Table Updates
    console.log('📌 Updating payments table...');
    const paymentCols = [
      { name: 'amount_paid', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'amount_remaining', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'seller_id', type: 'INT NULL' },
      { name: 'webhook_payload', type: 'JSON NULL' },
      { name: 'refund_amount', type: 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00' },
      { name: 'refund_reason', type: 'TEXT NULL' }
    ];

    for (const col of paymentCols) {
      if (!(await columnExists('payments', col.name))) {
        await connection.query(`ALTER TABLE payments ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  + Added payments.${col.name}`);
      }
    }

    try {
      await connection.query(
        `ALTER TABLE payments MODIFY COLUMN status 
         ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING'`
      );
      await connection.query("ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'PKR'");
      console.log('  ✓ Updated payments.status enum & currency default');
    } catch (e) {
      console.warn('  ⚠️  Could not modify payments.status enum:', e.message);
    }

    // 5. Create Seller Payouts Table
    console.log('📌 Creating seller_payouts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS seller_payouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
        payout_method VARCHAR(50) NOT NULL,
        payout_destination VARCHAR(150) NOT NULL,
        payout_model ENUM('MERCHANT_SETTLEMENT', 'MARKETPLACE_SPLIT') NOT NULL DEFAULT 'MERCHANT_SETTLEMENT',
        status ENUM('PENDING', 'PROCESSING', 'SETTLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
        reference_id VARCHAR(100) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE RESTRICT,
        INDEX idx_seller_payouts_seller (seller_id),
        INDEX idx_seller_payouts_status (status)
      ) ENGINE=InnoDB;
    `);
    console.log('  ✓ seller_payouts table ready');

    // 6. Create Seller Profile Audits Table
    console.log('📌 Creating seller_profile_audits table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS seller_profile_audits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NOT NULL,
        changed_by INT NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        old_value TEXT NULL,
        new_value TEXT NULL,
        triggered_reverification BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_profile_audits_seller (seller_id)
      ) ENGINE=InnoDB;
    `);
    console.log('  ✓ seller_profile_audits table ready');

    // Seed default administrative location hierarchy and fulfillment data for existing demo sellers
    console.log('📌 Populating demo seller location hierarchy and polygon...');
    await connection.query(`
      UPDATE sellers 
      SET 
        province = COALESCE(province, 'Punjab'),
        district = COALESCE(district, 'Sahiwal'),
        tehsil = COALESCE(tehsil, 'Sahiwal'),
        village = COALESCE(village, 'Chak 88/9-L'),
        seller_declared_area_acres = COALESCE(seller_declared_area_acres, 25.00),
        calculated_polygon_area_acres = COALESCE(calculated_polygon_area_acres, 24.85),
        farm_polygon = COALESCE(farm_polygon, JSON_ARRAY(
          JSON_OBJECT('lat', 30.6650, 'lng', 73.1020),
          JSON_OBJECT('lat', 30.6685, 'lng', 73.1090),
          JSON_OBJECT('lat', 30.6630, 'lng', 73.1115),
          JSON_OBJECT('lat', 30.6600, 'lng', 73.1040)
        )),
        delivery_available = TRUE,
        pickup_available = TRUE,
        estimated_delivery_min_days = 2,
        estimated_delivery_max_days = 4,
        delivery_fee = 300.00,
        pickup_instructions = 'Main Farm Gate 2, Sahiwal-Faisalabad Road. Loading staff available 08:00 to 18:00.',
        payout_method = 'BANK_TRANSFER',
        payout_account_title = farm_name,
        payout_account_number = 'PK36HABB00012345678901',
        payout_bank_name = 'Habib Bank Limited (HBL)',
        payout_status = 'VERIFIED'
      WHERE id > 0 AND (province IS NULL OR farm_polygon IS NULL)
    `);

    // Ensure all existing orders have currency 'PKR', amount_due, amount_paid, amount_remaining
    await connection.query(`
      UPDATE orders
      SET 
        currency = 'PKR',
        delivery_fee = COALESCE(delivery_fee, 300.00),
        amount_due = total_amount,
        amount_paid = CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0.00 END,
        amount_remaining = CASE WHEN payment_status = 'PAID' THEN 0.00 ELSE total_amount END
      WHERE id > 0 AND (currency != 'PKR' OR amount_due = 0)
    `);

    await connection.query(`
      UPDATE seller_orders
      SET 
        amount_due = subtotal,
        amount_paid = CASE WHEN payment_status = 'PAID' THEN subtotal ELSE 0.00 END,
        amount_remaining = CASE WHEN payment_status = 'PAID' THEN 0.00 ELSE subtotal END
      WHERE id > 0 AND amount_due = 0
    `);

    await connection.query(`
      UPDATE payments
      SET 
        currency = 'PKR',
        amount_paid = CASE WHEN status = 'PAID' THEN amount ELSE 0.00 END,
        amount_remaining = CASE WHEN status = 'PAID' THEN 0.00 ELSE amount END
      WHERE id > 0 AND currency != 'PKR'
    `);

    console.log('✅ Migration v2 Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
