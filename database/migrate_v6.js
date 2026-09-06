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
  console.log('🌱 Starting Kisanova Migration V6 (Mandatory Email Verification via Brevo)...');
  const connection = await pool.getConnection();

  try {
    // 1. Check and add email verification columns to users table
    console.log('1. Checking users table email verification columns...');

    if (!await hasColumn(connection, 'users', 'email_verified')) {
      console.log('   Adding users.email_verified...');
      await connection.query('ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER role');
    }

    if (!await hasColumn(connection, 'users', 'email_verified_at')) {
      console.log('   Adding users.email_verified_at...');
      await connection.query('ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER email_verified');
    }

    if (!await hasColumn(connection, 'users', 'email_verification_token_hash')) {
      console.log('   Adding users.email_verification_token_hash...');
      await connection.query('ALTER TABLE users ADD COLUMN email_verification_token_hash VARCHAR(64) NULL AFTER email_verified_at');
    }

    if (!await hasColumn(connection, 'users', 'email_verification_expires_at')) {
      console.log('   Adding users.email_verification_expires_at...');
      await connection.query('ALTER TABLE users ADD COLUMN email_verification_expires_at DATETIME NULL AFTER email_verification_token_hash');
    }

    if (!await hasIndex(connection, 'users', 'idx_user_email_verif_hash')) {
      console.log('   Creating index idx_user_email_verif_hash...');
      await connection.query('ALTER TABLE users ADD INDEX idx_user_email_verif_hash (email_verification_token_hash)');
    }

    // 2. Safe backfill for existing seeded demo accounts
    console.log('2. Backfilling existing demo and admin accounts to verified state...');
    await connection.query(`
      UPDATE users 
      SET email_verified = TRUE, email_verified_at = NOW()
      WHERE email IN (
        'admin@kisanova.com',
        'seller1@kisanova.com',
        'seller2@kisanova.com',
        'seller3@kisanova.com',
        'buyer1@kisanova.com',
        'buyer2@kisanova.com'
      ) OR role = 'ADMIN'
    `);

    console.log('✅ Migration V6 successfully completed!');
  } catch (err) {
    console.error('❌ Migration V6 failed:', err);
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
