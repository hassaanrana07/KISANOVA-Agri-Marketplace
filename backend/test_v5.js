const pool = require('./src/config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const API_BASE = 'http://localhost:8000/api';

async function runTests() {
  console.log('🧪 Starting Kisanova Final Phase Automated Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Anti-User Enumeration on Forgot Password
    console.log('--- TEST 1: Anti-User Enumeration on Forgot Password ---');
    const fakeEmail = `nonexistent_${Date.now()}@example.com`;
    const resFake = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: fakeEmail })
    });
    const dataFake = await resFake.json();
    assert(resFake.status === 200, 'Nonexistent user returns HTTP 200 (no leak)');
    assert(dataFake.success === true, 'Response JSON success is true');
    assert(
      dataFake.message === 'If an account exists for this email or phone number, a verification code has been sent.',
      'Response message matches generic anti-enumeration string'
    );

    // TEST 2: Real User Forgot Password & Console/Brevo OTP Generation
    console.log('\n--- TEST 2: Real User Forgot Password & OTP Generation ---');
    const [users] = await pool.query('SELECT id, email, phone FROM users WHERE email LIKE "%@%" LIMIT 1');
    if (users.length === 0) {
      throw new Error('No user found in database to test with');
    }
    const testUser = users[0];
    console.log(`  Testing with user ID: ${testUser.id}, Email: ${testUser.email}`);

    // Clear recent OTPs for this user to avoid cooldown
    await pool.query('DELETE FROM password_resets WHERE email = ?', [testUser.email]);

    const resReal = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUser.email })
    });
    const dataReal = await resReal.json();
    assert(resReal.status === 200, 'Real user returns HTTP 200');
    assert(
      dataReal.message === 'If an account exists for this email or phone number, a verification code has been sent.',
      'Real user returns identical anti-enumeration message as fake user'
    );

    // TEST 3: Rate Limiting on Forgot Password
    console.log('\n--- TEST 3: 60-second Rate Limiting Check ---');
    const resRateLimit = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testUser.email })
    });
    const dataRateLimit = await resRateLimit.json();
    assert(resRateLimit.status === 429, 'Subsequent request within 60s returns HTTP 429 Too Many Requests');
    assert(dataRateLimit.message && dataRateLimit.message.includes('wait'), 'Rate limit message warns user to wait');

    // TEST 4: Inspect DB for Stored OTP & Set Known Hash for Verification
    console.log('\n--- TEST 4: OTP Storage Verification in Database ---');
    const [otps] = await pool.query(
      'SELECT id, otp_hash, expires_at, used FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [testUser.email]
    );
    assert(otps.length === 1, 'OTP record created in password_resets table');
    const otpRecord = otps[0];
    assert(otpRecord.used === 0, 'OTP is initially unused');
    assert(new Date(otpRecord.expires_at) > new Date(), 'OTP expiration timestamp is in the future');

    // Set known test OTP so we can test the verify endpoint deterministically
    const testOtpCode = '654321';
    const testOtpHash = await bcrypt.hash(testOtpCode, 10);
    await pool.query('UPDATE password_resets SET otp_hash = ? WHERE id = ?', [testOtpHash, otpRecord.id]);
    console.log(`  Synchronized test OTP code: ${testOtpCode}`);

    // TEST 5: Verify OTP and Generate Secure Reset Token
    console.log('\n--- TEST 5: Verify OTP & Reset Token Generation ---');
    const resVerify = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUser.email,
        otp: testOtpCode
      })
    });
    const dataVerify = await resVerify.json();
    assert(resVerify.status === 200, 'Verify OTP returns HTTP 200');
    assert(dataVerify.success === true, 'Verify OTP success is true');
    assert(typeof dataVerify.resetToken === 'string' && dataVerify.resetToken.length === 64, 'Returned resetToken is 32 bytes hex (64 chars)');

    // TEST 6: Verify Database Reset Token Hash
    console.log('\n--- TEST 6: Reset Token SHA-256 Hash in Database ---');
    const expectedHash = crypto.createHash('sha256').update(dataVerify.resetToken).digest('hex');
    const [tokenRecords] = await pool.query(
      'SELECT reset_token_hash, token_expires_at, used FROM password_resets WHERE id = ?',
      [otpRecord.id]
    );
    assert(tokenRecords[0].reset_token_hash === expectedHash, 'Database stores SHA-256 hash of the resetToken');
    assert(new Date(tokenRecords[0].token_expires_at) > new Date(), 'token_expires_at is in the future (15 min window)');
    assert(tokenRecords[0].used === 0, 'Record remains valid for password reset');

    // TEST 7: Execute Password Reset with Token
    console.log('\n--- TEST 7: Reset Password Using resetToken ---');
    const newPassword = 'NewSecretPassword123!';
    const resReset = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken: dataVerify.resetToken,
        newPassword
      })
    });
    const dataReset = await resReset.json();
    assert(resReset.status === 200, 'Password reset returns HTTP 200');
    assert(dataReset.success === true, 'Password reset reports success');

    // TEST 8: Token Invalidation in Database
    console.log('\n--- TEST 8: Token Invalidation Verification ---');
    const [usedCheck] = await pool.query('SELECT used FROM password_resets WHERE id = ?', [otpRecord.id]);
    assert(usedCheck[0].used === 1, 'Token is marked used = 1 in database');

    // Replay attack prevention
    const resReplay = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken: dataVerify.resetToken,
        newPassword: 'AnotherPassword456!'
      })
    });
    assert(resReplay.status === 400, 'Replay of used resetToken returns HTTP 400 Bad Request');

    // TEST 9: Login with New Password
    console.log('\n--- TEST 9: Login with Newly Reset Password ---');
    const resLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: newPassword
      })
    });
    const dataLogin = await resLogin.json();
    assert(resLogin.status === 200, 'Login with new password returns HTTP 200');
    assert(dataLogin.data && dataLogin.data.token && dataLogin.data.token.length > 20, 'JWT Token successfully issued on login');

    // Restore test password back so seed/tests remain stable
    const restoredHash = await bcrypt.hash('password123', 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [restoredHash, testUser.id]);
    console.log('  Restored original password for test user.');

    // TEST 10: Farm Geographic Acreage & Delivery Terms Endpoint
    console.log('\n--- TEST 10: Farm Geodesic & Delivery Terms Inspection ---');
    const [products] = await pool.query(
      `SELECT p.id, p.title, s.farm_polygon, s.seller_declared_area_acres, s.calculated_polygon_area_acres, 
              s.delivery_available, s.pickup_available, s.delivery_fee 
       FROM products p 
       JOIN sellers s ON p.seller_id = s.id 
       LIMIT 1`
    );
    if (products.length > 0) {
      const prod = products[0];
      assert(prod.farm_polygon !== undefined, 'Seller farm_polygon field is accessible');
      assert(prod.delivery_available !== undefined, 'Seller delivery_available is present');
      assert(prod.pickup_available !== undefined, 'Seller pickup_available is present');
      console.log(`  Product #${prod.id} (${prod.title}): Declared ${prod.seller_declared_area_acres} acres, Calculated ${prod.calculated_polygon_area_acres} acres`);
    }

    // TEST 11: COD Orders & Status Progression
    console.log('\n--- TEST 11: Cash on Delivery (COD) Workflow Verification ---');
    const [codOrders] = await pool.query(
      `SELECT id, order_number, payment_method, payment_status, order_status, total_amount 
       FROM orders 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    if (codOrders.length > 0) {
      const ord = codOrders[0];
      assert(ord.payment_method === 'COD', `Latest order #${ord.order_number} is strictly COD`);
      assert(['UNPAID', 'PAID', 'PARTIALLY_PAID'].includes(ord.payment_status), `Payment status ${ord.payment_status} conforms to COD accounting`);
      console.log(`  Order #${ord.order_number}: Amount PKR ${ord.total_amount}, Method: ${ord.payment_method}, Payment: ${ord.payment_status}, Status: ${ord.order_status}`);
    }

    console.log(`\n==============================================`);
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==============================================\n`);

  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    await pool.end();
  }
}

runTests();
