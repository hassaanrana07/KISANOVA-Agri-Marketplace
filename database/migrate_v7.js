const path = require('path');
const pool = require('../backend/src/config/db');

async function hasColumn(connection, table, column) {
  const [cols] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  return cols.length > 0;
}

async function hasTable(connection, table) {
  const [tables] = await connection.query(`SHOW TABLES LIKE ?`, [table]);
  return tables.length > 0;
}

async function migrate() {
  console.log('🌱 Starting Kisanova Migration V7 (COD-Only: Remove Bank & Settlement Architecture)...');
  const connection = await pool.getConnection();

  try {
    // 1. Remove payout columns from sellers table
    console.log('1. Checking and dropping payout columns from sellers table...');
    const payoutCols = [
      'payout_method',
      'payout_account_title',
      'payout_account_number',
      'payout_bank_name',
      'payout_status'
    ];

    for (const col of payoutCols) {
      if (await hasColumn(connection, 'sellers', col)) {
        console.log(`   Dropping sellers.${col}...`);
        await connection.query(`ALTER TABLE sellers DROP COLUMN \`${col}\``);
      } else {
        console.log(`   sellers.${col} already absent.`);
      }
    }

    // 2. Drop seller_payouts table if it exists
    console.log('2. Checking seller_payouts table...');
    if (await hasTable(connection, 'seller_payouts')) {
      console.log('   Dropping table seller_payouts...');
      await connection.query('DROP TABLE seller_payouts');
    } else {
      console.log('   Table seller_payouts already absent.');
    }

    console.log('✅ Migration V7 successfully completed!');
  } catch (err) {
    console.error('❌ Migration V7 failed:', err);
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
