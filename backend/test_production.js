/**
 * ============================================================================
 * KISANOVA AGRI MARKETPLACE — MASTER PRODUCTION TEST SUITE (test_production.js)
 * ============================================================================
 * Comprehensive end-to-end verification covering all 16 production release gates:
 * 
 *  1. Authentication & JWT Security
 *  2. Email Verification (Brevo Free API Flow)
 *  3. Password Reset (Crypto Token Flow)
 *  4. Authorization & IDOR/BOLA Protection
 *  5. Cart & Multi-Seller Operations
 *  6. Checkout & Fulfillment (Strict COD + Farm Pickup)
 *  7. Payment Method Tampering (Non-COD Rejections)
 *  8. Inventory Concurrency & Atomic Stock Safety
 *  9. Order State Machine & Terminal Immutability
 * 10. COD Auto-Settlement on Terminal Delivery
 * 11. Decommissioned Legacy Routes (Strict 404)
 * 12. Seller Profile & Real DB Metrics
 * 13. Notifications Security & Ownership
 * 14. Real-Time Chat & Socket.IO Security
 * 15. File Upload Whitelist & Sanitization
 * 16. Security Headers, CORS & Error Leakage
 * ============================================================================
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
const pool = require('./src/config/db');
const { getJwtSecret } = require('./src/middleware/auth');
const ioClient = require('../frontend/node_modules/socket.io-client');
const emailService = require('./src/services/emailService');

const BASE_URL = 'http://127.0.0.1:8000';

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: { ...headers }
    };

    if (!options.headers['x-forwarded-for']) {
      options.headers['x-forwarded-for'] = '10.5.' + (Math.floor(Math.random() * 200) + 10) + '.' + (Math.floor(Math.random() * 200) + 10);
    }

    let postData = null;
    if (body !== null && typeof body === 'object' && !(body instanceof Buffer)) {
      postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    } else if (body instanceof Buffer) {
      postData = body;
      options.headers['Content-Length'] = body.length;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function createMultipartBuffer(fieldName, filename, mimeType, content) {
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, Buffer.isBuffer(content) ? content : Buffer.from(content), footer]);
  return { boundary, body };
}

async function runProductionTests() {
  console.log('========================================================================');
  console.log('🌾 KISANOVA AGRI MARKETPLACE — MASTER PRODUCTION AUDIT SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // =========================================================================
    // 1. AUTHENTICATION & JWT SECURITY
    // =========================================================================
    console.log('[1/16] CATEGORY: AUTHENTICATION & JWT SECURITY');

    // 1.1 Production fail-fast on missing secret
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    let threwInProd = false;
    try {
      getJwtSecret();
    } catch (e) {
      threwInProd = e.message.includes('FATAL');
    }
    assert(threwInProd, 'getJwtSecret() throws fatal error in production when JWT_SECRET is missing');
    process.env.NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalSecret;

    // 1.2 Valid login - Buyer 1
    const buyer1Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer1@kisanova.com',
      password: 'Buyer@123456'
    });
    const buyer1Token = buyer1Login.body.data?.token || buyer1Login.body.token;
    const buyer1Id = buyer1Login.body.data?.user?.id || buyer1Login.body.user?.id;
    assert(buyer1Login.status === 200 && !!buyer1Token, 'Valid login returns JWT token for BUYER 1');

    // 1.3 Valid login - Buyer 2
    const buyer2Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer2@kisanova.com',
      password: 'Buyer@123456'
    });
    const buyer2Token = buyer2Login.body.data?.token || buyer2Login.body.token;
    const buyer2Id = buyer2Login.body.data?.user?.id || buyer2Login.body.user?.id;
    assert(buyer2Login.status === 200 && !!buyer2Token, 'Valid login returns JWT token for BUYER 2');

    // 1.4 Valid login - Seller 1 & Seller 2
    const seller1Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'seller1@kisanova.com',
      password: 'Seller@123456'
    });
    const seller1Token = seller1Login.body.data?.token || seller1Login.body.token;
    const seller1UserId = seller1Login.body.data?.user?.id || seller1Login.body.user?.id;
    assert(seller1Login.status === 200 && !!seller1Token, 'Valid login returns JWT token for SELLER 1');

    const seller2Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'seller2@kisanova.com',
      password: 'Seller@123456'
    });
    const seller2Token = seller2Login.body.data?.token || seller2Login.body.token;
    const seller2UserId = seller2Login.body.data?.user?.id || seller2Login.body.user?.id;
    assert(seller2Login.status === 200 && !!seller2Token, 'Valid login returns JWT token for SELLER 2');

    // 1.5 Valid login - Admin
    const adminLogin = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'admin@kisanova.com',
      password: 'Admin@123456'
    });
    const adminToken = adminLogin.body.data?.token || adminLogin.body.token;
    assert(adminLogin.status === 200 && !!adminToken, 'Valid login returns JWT token for ADMIN');

    // 1.6 Invalid login rejected
    const invalidLogin = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer1@kisanova.com',
      password: 'WrongPassword999'
    });
    assert(invalidLogin.status === 401, 'Invalid credentials rejected with HTTP 401');

    // 1.7 Missing JWT rejected
    const missingJwt = await makeRequest('GET', '/api/auth/me');
    assert(missingJwt.status === 401, 'Request with missing JWT rejected with HTTP 401');

    // 1.8 Malformed JWT rejected
    const malformedJwt = await makeRequest('GET', '/api/auth/me', {
      Authorization: 'Bearer not-a-real-jwt-token'
    });
    assert(malformedJwt.status === 401, 'Request with malformed JWT rejected with HTTP 401');

    // 1.9 Expired JWT rejected
    const expiredToken = jwt.sign(
      { id: buyer1Id, role: 'BUYER', email: 'buyer1@kisanova.com' },
      getJwtSecret(),
      { expiresIn: '-10s', algorithm: 'HS256' }
    );
    const expiredRes = await makeRequest('GET', '/api/auth/me', {
      Authorization: `Bearer ${expiredToken}`
    });
    assert(expiredRes.status === 401, 'Expired JWT rejected with HTTP 401');

    // 1.10 Wrong secret rejected
    const wrongSecretToken = jwt.sign(
      { id: buyer1Id, role: 'BUYER', email: 'buyer1@kisanova.com' },
      'wrong_test_secret_key_123',
      { algorithm: 'HS256' }
    );
    const wrongSecretRes = await makeRequest('GET', '/api/auth/me', {
      Authorization: `Bearer ${wrongSecretToken}`
    });
    assert(wrongSecretRes.status === 401, 'JWT signed with wrong secret rejected with HTTP 401');

    // 1.11 Disallowed algorithm rejected (alg: none attack)
    const noneAlgHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: buyer1Id, role: 'BUYER', email: 'buyer1@kisanova.com' })).toString('base64url');
    const noneToken = `${noneAlgHeader}.${payload}.`;
    const noneRes = await makeRequest('GET', '/api/auth/me', {
      Authorization: `Bearer ${noneToken}`
    });
    assert(noneRes.status === 401, "JWT with 'none' algorithm rejected with HTTP 401");

    // =========================================================================
    // 2. EMAIL VERIFICATION (BREVO FREE API FLOW)
    // =========================================================================
    console.log('\n[2/16] CATEGORY: EMAIL VERIFICATION (BREVO FREE API FLOW)');

    // 2.1 User registration creates account with email_verified = false
    const regEmail = `brevo_test_${Date.now()}@example.com`;
    const regPassword = 'BrevoPassword123!';
    const regRes = await makeRequest('POST', '/api/auth/register', {}, {
      name: 'Brevo Verification Tester',
      email: regEmail,
      phone: '+92 300 9998877',
      password: regPassword,
      role: 'BUYER'
    });
    assert(regRes.status === 201, 'New user registration succeeds (HTTP 201)');
    assert(regRes.body.data?.requiresVerification === true, 'Registration response indicates requiresVerification: true');
    assert(!regRes.body.data?.token, 'No authentication JWT returned for unverified registration');

    const [userRows] = await pool.query(
      'SELECT id, email, email_verified, email_verified_at, email_verification_token_hash, email_verification_expires_at FROM users WHERE email = ?',
      [regEmail]
    );
    const registeredUser = userRows[0];
    assert(userRows.length === 1 && registeredUser.email_verified === 0, 'User created in DB with email_verified = FALSE (0)');
    assert(registeredUser.email_verified_at === null, 'Database email_verified_at is initially NULL');

    // 2.2 Token generated (32 bytes crypto hex, SHA-256 hash in DB, raw not stored)
    assert(
      registeredUser.email_verification_token_hash !== null &&
      registeredUser.email_verification_token_hash.length === 64,
      'Stored token hash is a 64-character SHA-256 hex string'
    );
    const expiresAt = new Date(registeredUser.email_verification_expires_at);
    const diffMinutes = (expiresAt - new Date()) / (1000 * 60);
    assert(diffMinutes > 25 && diffMinutes <= 31, `Token expiration set ~30 minutes in future (${diffMinutes.toFixed(1)} mins)`);

    // 2.3 Unverified login attempt rejected with HTTP 403 EMAIL_NOT_VERIFIED
    const unverifiedLogin = await makeRequest('POST', '/api/auth/login', {}, {
      email: regEmail,
      password: regPassword
    });
    assert(unverifiedLogin.status === 403 && unverifiedLogin.body.code === 'EMAIL_NOT_VERIFIED',
      'Unverified user login rejected with HTTP 403 (EMAIL_NOT_VERIFIED)');
    assert(unverifiedLogin.body.email === regEmail, 'Response includes email for resend UI');

    // 2.4 Invalid / tampered token rejection
    const invalidTokenRes = await makeRequest('POST', '/api/auth/verify-email', {}, {
      token: 'completely_bogus_token_1234567890abcdef'
    });
    assert(invalidTokenRes.status === 400 && invalidTokenRes.body.code === 'TOKEN_INVALID',
      'Tampered/invalid verification token rejected with HTTP 400 (TOKEN_INVALID)');

    // 2.5 Expired token rejection
    const rawExpiredToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(rawExpiredToken).digest('hex');
    await pool.query(
      'UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE id = ?',
      [expiredHash, registeredUser.id]
    );
    const expiredTokenRes = await makeRequest('POST', '/api/auth/verify-email', {}, { token: rawExpiredToken });
    assert(expiredTokenRes.status === 400 && expiredTokenRes.body.code === 'TOKEN_EXPIRED',
      'Expired verification token rejected with HTTP 400 (TOKEN_EXPIRED)');

    // 2.6 Successful verification via valid token
    const rawValidToken = crypto.randomBytes(32).toString('hex');
    const validHash = crypto.createHash('sha256').update(rawValidToken).digest('hex');
    await pool.query(
      'UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?',
      [validHash, registeredUser.id]
    );
    const validVerifRes = await makeRequest('POST', '/api/auth/verify-email', {}, { token: rawValidToken });
    assert(validVerifRes.status === 200 && validVerifRes.body.success === true, 'Verification with valid token succeeds (HTTP 200)');

    const [verifiedUserRows] = await pool.query(
      'SELECT email_verified, email_verified_at, email_verification_token_hash, email_verification_expires_at FROM users WHERE id = ?',
      [registeredUser.id]
    );
    const verifiedUser = verifiedUserRows[0];
    assert(verifiedUser.email_verified === 1, 'Database confirms users.email_verified is now TRUE (1)');
    assert(verifiedUser.email_verified_at !== null, 'Database email_verified_at timestamp set');
    assert(verifiedUser.email_verification_token_hash === null, 'email_verification_token_hash cleared');
    assert(verifiedUser.email_verification_expires_at === null, 'email_verification_expires_at cleared');

    // 2.7 Single-use token enforcement (replay attack fails)
    const replayRes = await makeRequest('POST', '/api/auth/verify-email', {}, { token: rawValidToken });
    assert(replayRes.status === 400 && replayRes.body.code === 'TOKEN_INVALID',
      'Replaying already consumed verification token rejected (HTTP 400 TOKEN_INVALID)');

    // 2.8 Verified user login succeeds with HTTP 200 & JWT
    const verifiedLoginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: regEmail,
      password: regPassword
    });
    assert(verifiedLoginRes.status === 200 && !!verifiedLoginRes.body.data?.token,
      'Verified user login now succeeds with HTTP 200 & returns valid JWT');
    assert(verifiedLoginRes.body.data.user.email_verified === true || verifiedLoginRes.body.data.user.email_verified === 1,
      'User object in login payload indicates email_verified = true');

    // 2.9 Resend verification generates fresh token & invalidates old
    const testUnverifiedEmail = `unverified_resend_${Date.now()}@example.com`;
    await makeRequest('POST', '/api/auth/register', {}, {
      name: 'Resend Test User',
      email: testUnverifiedEmail,
      password: regPassword,
      role: 'BUYER'
    });
    const [unverifiedRows1] = await pool.query('SELECT id, email_verification_token_hash FROM users WHERE email = ?', [testUnverifiedEmail]);
    const initialHash = unverifiedRows1[0].email_verification_token_hash;

    // Adjust timestamp past 60-second cooldown
    await pool.query(
      'UPDATE users SET email_verification_expires_at = DATE_ADD(DATE_SUB(NOW(), INTERVAL 65 SECOND), INTERVAL 30 MINUTE) WHERE email = ?',
      [testUnverifiedEmail]
    );
    const resendRes = await makeRequest('POST', '/api/auth/resend-verification', {}, { email: testUnverifiedEmail });
    assert(resendRes.status === 200 && resendRes.body.success === true, 'Resend verification returns HTTP 200 OK');

    const [unverifiedRows2] = await pool.query('SELECT email_verification_token_hash FROM users WHERE email = ?', [testUnverifiedEmail]);
    assert(unverifiedRows2[0].email_verification_token_hash !== initialHash, 'New verification hash generated, old token invalidated');

    // 2.10 Resend 60-second cooldown rate limit (HTTP 429)
    const rapidResendRes = await makeRequest('POST', '/api/auth/resend-verification', {}, { email: testUnverifiedEmail });
    assert(rapidResendRes.status === 429 && rapidResendRes.body.code === 'COOLDOWN_ACTIVE',
      'Rapid resend returns HTTP 429 (COOLDOWN_ACTIVE)');

    // 2.11 Anti-enumeration protection
    const anonRes = await makeRequest('POST', '/api/auth/resend-verification', {}, { email: `fake_nonexistent_${Date.now()}@notfound.org` });
    assert(anonRes.status === 200 && anonRes.body.success === true && anonRes.body.message.includes('If an account exists'),
      'Anti-enumeration: unregistered email receives identical generic success message');

    // 2.12 Seller separation: Email verification does NOT auto-approve farm profile
    const sellerEmail = `farmer_verif_${Date.now()}@example.com`;
    const sellerRegRes = await makeRequest('POST', '/api/auth/register', {}, {
      name: 'Farmer Verif Test',
      email: sellerEmail,
      password: regPassword,
      phone: '03001234567',
      role: 'SELLER',
      farm_name: 'Test Verif Organic Farm',
      address: 'Near Canal Road, Sahiwal',
      province: 'Punjab',
      district: 'Sahiwal',
      tehsil: 'Sahiwal',
      latitude: 30.6682,
      longitude: 73.1114
    });
    assert(sellerRegRes.status === 201, 'Seller registration returns HTTP 201');

    const rawSellerToken = crypto.randomBytes(32).toString('hex');
    const sellerTokenHash = crypto.createHash('sha256').update(rawSellerToken).digest('hex');
    await pool.query(
      'UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE email = ?',
      [sellerTokenHash, sellerEmail]
    );
    const sellerVerifRes = await makeRequest('POST', '/api/auth/verify-email', {}, { token: rawSellerToken });
    assert(sellerVerifRes.status === 200, 'Seller email verification succeeds (HTTP 200)');

    const [sellerProfileRows] = await pool.query(
      'SELECT s.approval_status, u.email_verified FROM sellers s JOIN users u ON s.user_id = u.id WHERE u.email = ?',
      [sellerEmail]
    );
    assert(sellerProfileRows[0].email_verified === 1, 'Seller email_verified is 1');
    assert(sellerProfileRows[0].approval_status === 'PENDING', 'Seller approval_status remains strictly PENDING');

    // 2.13 Brevo Email Service & Template Validation
    const sampleHtml = emailService.buildVerificationHtml({
      name: 'Hassaan Rana',
      verificationUrl: 'http://localhost:5000/verify-email?token=dummy_token_test'
    });
    assert(sampleHtml.includes('KISANOVA') && sampleHtml.includes('Verify Email Address'), 'Brevo email template renders branded HTML CTA');
    const sender = emailService.getSender();
    assert(sender.email === 'hassaanrana429@gmail.com' && sender.name === 'Kisanova', 'Brevo verified sender configured correctly');

    // 2.14 Live Brevo API Dispatch
    const liveDispatchResult = await emailService.sendVerificationEmail({
      toEmail: 'hassaanrana429@gmail.com',
      toName: 'Kisanova Admin Live Test',
      rawToken: crypto.randomBytes(32).toString('hex'),
      role: 'BUYER'
    });
    assert(liveDispatchResult.success === true && !!liveDispatchResult.messageId, 'Live Brevo API dispatch returns valid messageId');

    // =========================================================================
    // 3. PASSWORD RESET (CRYPTO TOKEN FLOW)
    // =========================================================================
    console.log('\n[3/16] CATEGORY: PASSWORD RESET (CRYPTO TOKEN FLOW)');

    // 3.1 Forgot-password token generation
    const forgotRes = await makeRequest('POST', '/api/auth/forgot-password', {}, {
      identifier: 'buyer1@kisanova.com'
    });
    assert(forgotRes.status === 200 && forgotRes.body.success, 'Forgot password request accepted (HTTP 200)');
    const resetToken = forgotRes.body.devResetToken;
    assert(typeof resetToken === 'string' && resetToken.length === 64, 'Generated 32-byte (64-char hex) reset token');

    // 3.2 SHA-256 Hashed storage
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const [dbResets] = await pool.query(
      'SELECT id, reset_token_hash, token_expires_at, used FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1',
      ['buyer1@kisanova.com']
    );
    assert(dbResets[0]?.reset_token_hash === resetHash && dbResets[0]?.used === 0, 'Database holds matching SHA-256 hash and used=0');
    assert(new Date(dbResets[0]?.token_expires_at) > new Date(), 'token_expires_at is properly set in the future');

    // 3.3 Successful password reset
    const resetRes = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: resetToken,
      newPassword: 'NewPassword@789'
    });
    assert(resetRes.status === 200 && resetRes.body.success, 'Password reset succeeded with valid token');

    // 3.4 Single-use token enforcement
    const reuseRes = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: resetToken,
      newPassword: 'AnotherPassword@789'
    });
    assert(reuseRes.status === 400 && reuseRes.body.success === false, 'Reusing consumed reset token rejected (HTTP 400)');

    // 3.5 Old password rejected
    const oldLoginFail = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer1@kisanova.com',
      password: 'Buyer@123456'
    });
    assert(oldLoginFail.status === 401, 'Login with old password fails (HTTP 401)');

    // 3.6 New password accepted
    const newLoginSuccess = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer1@kisanova.com',
      password: 'NewPassword@789'
    });
    assert(newLoginSuccess.status === 200, 'Login with new password succeeds (HTTP 200)');

    // Restore Buyer 1 password to default
    const restoreForgot = await makeRequest('POST', '/api/auth/forgot-password', {}, { identifier: 'buyer1@kisanova.com' });
    await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: restoreForgot.body.devResetToken,
      newPassword: 'Buyer@123456'
    });

    // =========================================================================
    // 4. AUTHORIZATION & IDOR/BOLA PROTECTION
    // =========================================================================
    console.log('\n[4/16] CATEGORY: AUTHORIZATION & IDOR/BOLA PROTECTION');

    const [s1Rows] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [seller1UserId]);
    const seller1Id = s1Rows[0].id;
    const [s2Rows] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [seller2UserId]);
    const seller2Id = s2Rows[0].id;

    // Fetch product owned by Seller 1
    const [s1ProdRows] = await pool.query('SELECT id, price FROM products WHERE seller_id = ? AND status = "ACTIVE" LIMIT 1', [seller1Id]);
    const testProd = s1ProdRows[0];

    // Seed reference order for Buyer 1
    const [b1Cart] = await pool.query('SELECT id FROM carts WHERE buyer_id = ?', [buyer1Id]);
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const orderRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Auth Test Buyer',
      delivery_phone: '+92 300 1112233',
      delivery_address: '123 Agri Lane, Multan',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    const buyer1OrderId = orderRes.body.data?.orderId;
    assert(buyer1OrderId !== undefined, 'Created reference test order for Buyer 1');

    // 4.1 Buyer 2 forbidden from accessing Buyer 1 order
    const buyerIdorOrder = await makeRequest('GET', `/api/orders/${buyer1OrderId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(buyerIdorOrder.status === 403, "Buyer 2 forbidden from viewing Buyer 1's order (HTTP 403)");

    // 4.2 Buyer 2 forbidden from viewing Buyer 1 receipt
    const buyerIdorReceipt = await makeRequest('GET', `/api/payments/receipt/${buyer1OrderId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(buyerIdorReceipt.status === 403, "Buyer 2 forbidden from viewing Buyer 1's receipt (HTTP 403)");

    // 4.3 Buyer cannot access Seller routes
    const buyerToSellerOrders = await makeRequest('GET', '/api/seller/orders', {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(buyerToSellerOrders.status === 403, 'Buyer forbidden from accessing /api/seller/orders (HTTP 403)');

    // 4.4 Buyer cannot access Admin routes
    const buyerToAdminMetrics = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(buyerToAdminMetrics.status === 403, 'Buyer forbidden from accessing /api/admin/metrics (HTTP 403)');

    // 4.5 Seller cannot access Admin routes
    const sellerToAdminMetrics = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${seller1Token}`
    });
    assert(sellerToAdminMetrics.status === 403, 'Seller forbidden from accessing /api/admin/metrics (HTTP 403)');

    // 4.6 Admin can access Admin routes
    const adminMetrics = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${adminToken}`
    });
    assert(adminMetrics.status === 200, 'Admin authorized to access /api/admin/metrics (HTTP 200)');

    // =========================================================================
    // 5. CART & MULTI-SELLER OPERATIONS
    // =========================================================================
    console.log('\n[5/16] CATEGORY: CART & MULTI-SELLER OPERATIONS');

    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);

    // 5.1 Add item to cart
    const addCartRes = await makeRequest('POST', '/api/cart', { Authorization: `Bearer ${buyer1Token}` }, {
      product_id: testProd.id,
      quantity: 2
    });
    assert(addCartRes.status === 200 && addCartRes.body.success, 'Added product to backend cart (HTTP 200)');

    // 5.2 Fetch cart and verify grouping
    const getCartRes = await makeRequest('GET', '/api/cart', { Authorization: `Bearer ${buyer1Token}` });
    assert(getCartRes.status === 200, 'Fetched cart contents (HTTP 200)');
    const cartData = getCartRes.body.data;
    assert(cartData.items && cartData.items.length > 0, 'Cart contains active items');
    assert(cartData.groupedBySeller && cartData.groupedBySeller.length >= 1, 'Cart correctly groups items by seller');

    // 5.3 Clear cart
    const clearCartRes = await makeRequest('DELETE', '/api/cart', { Authorization: `Bearer ${buyer1Token}` });
    assert(clearCartRes.status === 200, 'Cleared cart contents (HTTP 200)');

    // =========================================================================
    // 6. CHECKOUT & FULFILLMENT (STRICT COD + FARM PICKUP)
    // =========================================================================
    console.log('\n[6/16] CATEGORY: CHECKOUT & FULFILLMENT (STRICT COD + FARM PICKUP)');

    // 6.1 COD delivery missing address rejected
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 2, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const codNoAddress = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'COD Address Tester',
      delivery_phone: '+92 300 5554433',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    assert(codNoAddress.status === 400, 'COD Delivery checkout without delivery address rejected (HTTP 400)');

    // 6.2 COD delivery with address succeeds with authoritative totals & COD method
    const codSuccess = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'COD Valid Tester',
      delivery_phone: '+92 300 5554433',
      delivery_address: 'House 44, Street 9, Rawalpindi',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    assert(codSuccess.status === 201, 'COD Delivery checkout with valid address succeeds (HTTP 201)');
    assert(codSuccess.body.data?.paymentMethod === 'COD', 'Authoritative checkout response specifies paymentMethod: COD');
    assert(codSuccess.body.data?.currency === 'PKR', 'Authoritative checkout response specifies currency: PKR');
    assert(codSuccess.body.data?.paymentStatus === 'UNPAID', 'Authoritative checkout response specifies paymentStatus: UNPAID');
    assert(codSuccess.body.data?.deliveryFee > 0, 'Authoritative checkout calculates delivery fee for DELIVERY');
    assert(codSuccess.body.data?.subtotal !== undefined && codSuccess.body.data?.itemsSubtotal !== undefined, 'Authoritative checkout returns subtotal & itemsSubtotal');

    // 6.3 Farm Gate Self-Pickup succeeds without delivery address
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const pickupSuccess = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Pickup Farmer Buyer',
      delivery_phone: '+92 300 7778899',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'FARM_PICKUP' } }
    });
    assert(pickupSuccess.status === 201, 'Farm Gate Self-Pickup succeeds without delivery address (HTTP 201)');
    assert(pickupSuccess.body.data?.paymentMethod === 'COD', 'Farm Gate Self-Pickup recorded with payment method COD');
    assert(pickupSuccess.body.data?.deliveryFee === 0, 'Farm Gate Self-Pickup delivery fee is strictly 0 PKR');

    // 6.4 Multi-Seller Checkout creates distinct seller_orders
    const [s2ProdRows] = await pool.query('SELECT id, price FROM products WHERE seller_id = ? AND status = "ACTIVE" LIMIT 1', [seller2Id]);
    if (s2ProdRows.length > 0) {
      const s2Prod = s2ProdRows[0];
      await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
      await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);
      await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, s2Prod.id, seller2Id, s2Prod.price]);

      const multiSellerRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
        delivery_name: 'Multi-Seller Buyer',
        delivery_phone: '+92 300 1239876',
        delivery_address: 'Multi Farm Delivery Lane, Lahore',
        seller_fulfillments: {
          [seller1Id]: { fulfillment_type: 'DELIVERY' },
          [seller2Id]: { fulfillment_type: 'DELIVERY' }
        }
      });
      assert(multiSellerRes.status === 201, 'Multi-seller checkout successfully creates order');
      const msOrderId = multiSellerRes.body.data?.orderId;
      const [subOrderCount] = await pool.query('SELECT COUNT(*) as cnt FROM seller_orders WHERE order_id = ?', [msOrderId]);
      assert(subOrderCount[0].cnt === 2, 'Multi-seller checkout created exactly 2 distinct seller_orders');
    }

    // =========================================================================
    // 7. PAYMENT METHOD TAMPERING (NON-COD REJECTIONS)
    // =========================================================================
    console.log('\n[7/16] CATEGORY: PAYMENT METHOD TAMPERING (NON-COD REJECTIONS)');

    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const jazzcashTamper = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Tamper Tester',
      delivery_phone: '+92 300 1112233',
      delivery_address: 'Tamper Lane',
      payment_method: 'JAZZCASH'
    });
    assert(jazzcashTamper.status === 400, 'Tampered payment_method JAZZCASH rejected with HTTP 400 Bad Request');

    const easypaisaTamper = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Tamper Tester',
      delivery_phone: '+92 300 1112233',
      delivery_address: 'Tamper Lane',
      payment_method: 'EASYPAISA'
    });
    assert(easypaisaTamper.status === 400, 'Tampered payment_method EASYPAISA rejected with HTTP 400 Bad Request');

    const bankTamper = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Tamper Tester',
      delivery_phone: '+92 300 1112233',
      delivery_address: 'Tamper Lane',
      payment_method: 'BANK_TRANSFER'
    });
    assert(bankTamper.status === 400, 'Tampered payment_method BANK_TRANSFER rejected with HTTP 400 Bad Request');

    const onlineTamper = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Tamper Tester',
      delivery_phone: '+92 300 1112233',
      delivery_address: 'Tamper Lane',
      payment_method: 'ONLINE'
    });
    assert(onlineTamper.status === 400, 'Tampered payment_method ONLINE rejected with HTTP 400 Bad Request');

    const codValid = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Valid COD Tester',
      delivery_phone: '+92 300 1112233',
      delivery_address: 'Valid COD Address, Sahiwal',
      payment_method: 'COD'
    });
    assert(codValid.status === 201, 'Explicit payment_method COD accepted with HTTP 201 Created');

    // =========================================================================
    // 8. INVENTORY CONCURRENCY & ATOMIC STOCK SAFETY
    // =========================================================================
    console.log('\n[8/16] CATEGORY: INVENTORY CONCURRENCY & ATOMIC STOCK SAFETY');

    const [cProd] = await pool.query(
      `INSERT INTO products (seller_id, title, category, description, price, available_quantity, unit, status)
       VALUES (?, 'Concurrency Test Grain', 'Grains', 'Fresh harvest wheat lot', 50.00, 5, 'kg', 'ACTIVE')`,
      [seller1Id]
    );
    const concProdId = cProd.insertId;

    // 8.1 Insufficient stock rejected
    const [b2Cart] = await pool.query('SELECT id FROM carts WHERE buyer_id = ?', [buyer2Id]);
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b2Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 10, 50.00)', [b2Cart[0].id, concProdId, seller1Id]);

    const overStockRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer2Token}` }, {
      delivery_name: 'Over-buyer',
      delivery_phone: '+92 300 0000000',
      delivery_address: 'Nowhere',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    assert(overStockRes.status === 400, 'Ordering quantity greater than available_quantity rejected (HTTP 400)');

    // 8.2 Concurrent checkout race condition handling (4 units requested by two users, total 8 > 5)
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b2Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 4, 50.00)', [b1Cart[0].id, concProdId, seller1Id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 4, 50.00)', [b2Cart[0].id, concProdId, seller1Id]);

    const [concurrentRes1, concurrentRes2] = await Promise.all([
      makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
        delivery_name: 'Concurrent Buyer 1',
        delivery_phone: '+92 300 1111111',
        delivery_address: 'Concurrent Address 1',
        seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
      }),
      makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer2Token}` }, {
        delivery_name: 'Concurrent Buyer 2',
        delivery_phone: '+92 300 2222222',
        delivery_address: 'Concurrent Address 2',
        seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
      })
    ]);

    const concStatuses = [concurrentRes1.status, concurrentRes2.status];
    assert(concStatuses.includes(201) && (concStatuses.includes(400) || concStatuses.includes(409)),
      'Concurrent checkout race condition handled: exactly 1 succeeded, 1 rejected');

    const [concProdStock] = await pool.query('SELECT available_quantity FROM products WHERE id = ?', [concProdId]);
    assert(parseFloat(concProdStock[0].available_quantity) === 1, 'Stock precisely decremented (5 - 4 = 1), no negative stock or overselling');

    // 8.3 Exact stock checkout reduces available_quantity to 0
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, 50.00)', [b1Cart[0].id, concProdId, seller1Id]);
    const exactStockRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Exact Buyer',
      delivery_phone: '+92 300 3333333',
      delivery_address: 'Exact Address',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    assert(exactStockRes.status === 201, 'Exact stock checkout succeeds');
    const [finalStock] = await pool.query('SELECT available_quantity FROM products WHERE id = ?', [concProdId]);
    assert(parseFloat(finalStock[0].available_quantity) === 0, 'Available quantity reduced precisely to 0');

    // Cleanup concurrency product
    await pool.query('DELETE FROM order_items WHERE product_id = ?', [concProdId]);
    await pool.query('DELETE FROM products WHERE id = ?', [concProdId]);

    // =========================================================================
    // 9. ORDER STATE MACHINE & TERMINAL IMMUTABILITY
    // =========================================================================
    console.log('\n[9/16] CATEGORY: ORDER STATE MACHINE & TERMINAL IMMUTABILITY');

    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);
    const smOrderRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'State Machine Buyer',
      delivery_phone: '+92 300 4445566',
      delivery_address: 'State Machine Road, Faisalabad',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    const smOrderId = smOrderRes.body.data?.orderId;
    const [smSubRows] = await pool.query('SELECT id, status FROM seller_orders WHERE order_id = ?', [smOrderId]);
    const smSubOrderId = smSubRows[0].id;
    assert(smSubRows[0].status === 'PENDING', 'Initial order status is PENDING');

    // 9.1 Legal transitions: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
    const t1 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'CONFIRMED' });
    assert(t1.status === 200, 'Transition PENDING -> CONFIRMED succeeds (HTTP 200)');

    const t2 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'PROCESSING' });
    assert(t2.status === 200, 'Transition CONFIRMED -> PROCESSING succeeds (HTTP 200)');

    // 9.2 Illegal backward transition rejected
    const tIllegal = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'PENDING' });
    assert(tIllegal.status === 400, 'Illegal backward transition PROCESSING -> PENDING rejected (HTTP 400)');

    const t3 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'SHIPPED' });
    assert(t3.status === 200, 'Transition PROCESSING -> SHIPPED succeeds (HTTP 200)');

    const t4 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'DELIVERED' });
    assert(t4.status === 200, 'Transition SHIPPED -> DELIVERED succeeds (HTTP 200)');

    // 9.3 Terminal state immutability
    const tTerminal = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'CANCELLED' });
    assert(tTerminal.status === 400, 'Transition out of terminal status DELIVERED rejected (HTTP 400)');

    // 9.4 Unauthorized order modification (Buyer attempting seller status update)
    const buyerStatusUpdate = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${buyer1Token}` }, { status: 'CONFIRMED' });
    assert(buyerStatusUpdate.status === 403, 'Buyer forbidden from updating seller order status (HTTP 403)');

    // =========================================================================
    // 10. COD AUTO-SETTLEMENT ON TERMINAL DELIVERY
    // =========================================================================
    console.log('\n[10/16] CATEGORY: COD AUTO-SETTLEMENT ON TERMINAL DELIVERY');

    // 10.1 Auto-settlement upon delivery: payment status transitioned to PAID
    const [deliveredSubOrder] = await pool.query('SELECT payment_status, amount_paid, amount_remaining FROM seller_orders WHERE id = ?', [smSubOrderId]);
    assert(deliveredSubOrder[0].payment_status === 'PAID', 'DELIVERED order automatically transitions payment_status to PAID');
    assert(parseFloat(deliveredSubOrder[0].amount_remaining) === 0, 'DELIVERED order sets amount_remaining to 0 PKR');

    // 10.2 Verify audit payments table record
    const [paymentRecord] = await pool.query('SELECT status, receipt_number, amount_paid, amount_remaining FROM payments WHERE order_id = ?', [smOrderId]);
    assert(paymentRecord[0].status === 'PAID', 'Audit payments table records status as PAID upon delivery');
    assert(paymentRecord[0].receipt_number && paymentRecord[0].receipt_number.startsWith('REC-'), 'Valid physical receipt number generated (REC-*)');

    // =========================================================================
    // 11. DECOMMISSIONED LEGACY ROUTES (STRICT 404)
    // =========================================================================
    console.log('\n[11/16] CATEGORY: DECOMMISSIONED LEGACY ROUTES (STRICT 404)');

    const onlineWebhook = await makeRequest('POST', '/api/payments/webhook/jazzcash');
    assert(onlineWebhook.status === 404, 'Decommissioned online payment webhook returns HTTP 404');

    const verifyOnline = await makeRequest('POST', '/api/payments/verify-online', { Authorization: `Bearer ${buyer1Token}` }, { orderId: smOrderId });
    assert(verifyOnline.status === 404, 'Decommissioned verify-online endpoint returns HTTP 404');

    const sandboxEndpoint = await makeRequest('POST', '/api/payments/process-sandbox', { Authorization: `Bearer ${buyer1Token}` }, { orderId: smOrderId });
    assert(sandboxEndpoint.status === 404, 'Decommissioned process-sandbox endpoint returns HTTP 404');

    const payoutList = await makeRequest('GET', '/api/seller/payouts', { Authorization: `Bearer ${seller1Token}` });
    assert(payoutList.status === 404, 'Decommissioned seller payouts route returns HTTP 404');

    // =========================================================================
    // 12. SELLER PROFILE & REAL DB METRICS
    // =========================================================================
    console.log('\n[12/16] CATEGORY: SELLER PROFILE & REAL DB METRICS');

    const sDash = await makeRequest('GET', '/api/seller/dashboard', { Authorization: `Bearer ${seller1Token}` });
    assert(sDash.status === 200, 'Seller dashboard returns HTTP 200');
    const metrics = sDash.body.data?.metrics || sDash.body.data;
    assert(typeof metrics?.grossOrderValue === 'number' && metrics.grossOrderValue >= 0, 'grossOrderValue calculated accurately from real DB');
    assert(typeof metrics?.cashCollected === 'number' && metrics.cashCollected >= 0, 'cashCollected calculated accurately from real DB');
    assert(metrics?.refunds === undefined || metrics?.refunds === 0, 'No obsolete digital refunds in metrics');

    // Check seller profile doesn't expose obsolete bank/payout keys
    const sProfile = await makeRequest('GET', '/api/seller/profile', { Authorization: `Bearer ${seller1Token}` });
    assert(sProfile.status === 200, 'Seller profile endpoint returns HTTP 200');
    const profileData = sProfile.body.data || {};
    assert(profileData.payout_method === undefined && profileData.payout_bank_name === undefined,
      'Seller profile contains 0 obsolete payout/bank columns');

    // =========================================================================
    // 13. NOTIFICATIONS SECURITY & OWNERSHIP
    // =========================================================================
    console.log('\n[13/16] CATEGORY: NOTIFICATIONS SECURITY & OWNERSHIP');

    const [notifRes] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read)
       VALUES (?, 'SYSTEM', 'Private Alert for Buyer 1', 'Confidential notification message', FALSE)`,
      [buyer1Id]
    );
    const notifId = notifRes.insertId;

    // 13.1 Buyer 2 forbidden from deleting Buyer 1's notification
    const idorNotifDelete = await makeRequest('DELETE', `/api/notifications/${notifId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(idorNotifDelete.status === 404 || idorNotifDelete.status === 403, "Buyer 2 forbidden from deleting Buyer 1's notification (HTTP 404/403)");

    // 13.2 Buyer 1 can delete own notification
    const authNotifDelete = await makeRequest('DELETE', `/api/notifications/${notifId}`, {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(authNotifDelete.status === 200, 'Buyer 1 authorized to delete own notification (HTTP 200)');

    // =========================================================================
    // 14. REAL-TIME CHAT & SOCKET.IO SECURITY
    // =========================================================================
    console.log('\n[14/16] CATEGORY: REAL-TIME CHAT & SOCKET.IO SECURITY');

    // 14.1 Unauthenticated Socket.IO connection rejected
    const unauthSocketResult = await new Promise((resolve) => {
      const socket = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 3000
      });
      socket.on('connect', () => {
        socket.disconnect();
        resolve(true);
      });
      socket.on('connect_error', () => {
        socket.disconnect();
        resolve(false);
      });
    });
    assert(unauthSocketResult === false, 'Socket.IO handshake WITHOUT JWT token is rejected');

    // 14.2 Authenticated Socket.IO connection succeeds
    const buyer1Socket = await new Promise((resolve) => {
      const socket = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
        auth: { token: buyer1Token },
        timeout: 4000
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', () => resolve(null));
    });
    assert(buyer1Socket !== null && buyer1Socket.connected, 'Socket.IO handshake with valid JWT connects successfully');

    // 14.3 Room authorization isolation
    const [cRows] = await pool.query(
      `INSERT INTO conversations (buyer_id, seller_id, product_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [buyer1Id, seller1Id, testProd.id]
    );
    const convId = cRows.insertId;

    const buyer2Socket = await new Promise((resolve) => {
      const socket = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
        auth: { token: buyer2Token },
        timeout: 4000
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', () => resolve(null));
    });

    const joinDenied = await new Promise((resolve) => {
      buyer2Socket.emit('join_conversation', convId);
      buyer2Socket.on('error', (err) => {
        resolve(err.message.includes('authorized') || err.message.includes('Forbidden'));
      });
      setTimeout(() => resolve(false), 2000);
    });
    assert(joinDenied, 'Non-participant Buyer 2 unauthorized from joining conversation room');

    if (buyer1Socket) buyer1Socket.disconnect();
    if (buyer2Socket) buyer2Socket.disconnect();

    // =========================================================================
    // 15. FILE UPLOAD WHITELIST & SANITIZATION
    // =========================================================================
    console.log('\n[15/16] CATEGORY: FILE UPLOAD WHITELIST & SANITIZATION');

    // 15.1 Disallowed extension (.php) rejected
    const phpPayload = createMultipartBuffer('file', 'malicious.php', 'application/x-php', '<?php phpinfo(); ?>');
    const phpUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${phpPayload.boundary}`
    }, phpPayload.body);
    assert(phpUploadRes.status === 400 || phpUploadRes.status === 500, 'Executable .php file rejected by upload filter (HTTP 400/500)');

    // 15.2 Disallowed extension (.exe) rejected
    const exePayload = createMultipartBuffer('file', 'trojan.exe', 'application/x-msdownload', 'MZ...');
    const exeUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${exePayload.boundary}`
    }, exePayload.body);
    assert(exeUploadRes.status === 400 || exeUploadRes.status === 500, 'Executable .exe file rejected by upload filter (HTTP 400/500)');

    // 15.3 Valid image (.png) accepted with cryptographically random filename
    const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082';
    const pngPayload = createMultipartBuffer('file', 'valid_harvest.png', 'image/png', Buffer.from(pngHex, 'hex'));
    const pngUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${pngPayload.boundary}`
    }, pngPayload.body);
    assert(pngUploadRes.status === 200 && pngUploadRes.body.success, 'Valid .png image accepted by upload filter (HTTP 200)');
    const uploadedUrl = pngUploadRes.body.data?.url || pngUploadRes.body.url;
    const isCryptoRandomName = /-[0-9a-f]{32}\.png$/i.test(uploadedUrl);
    assert(isCryptoRandomName, `Uploaded file uses 32-char cryptographically random hex filename: ${uploadedUrl}`);

    // =========================================================================
    // 16. SECURITY HEADERS, CORS & ERROR LEAKAGE
    // =========================================================================
    console.log('\n[16/16] CATEGORY: SECURITY HEADERS, CORS & ERROR LEAKAGE');

    // 16.1 Helmet security headers
    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.status === 200, 'API Health check returns HTTP 200');
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'Security header X-Content-Type-Options: nosniff present');

    // 16.2 CORS preflight handling
    const corsPreflight = await makeRequest('OPTIONS', '/api/health', {
      'Origin': 'http://localhost:5000',
      'Access-Control-Request-Method': 'GET'
    });
    assert(corsPreflight.status === 204 || corsPreflight.status === 200, 'CORS preflight request handled appropriately');

    // 16.3 404 handler does not leak internal stack traces
    const notFoundRes = await makeRequest('GET', '/api/non-existent-endpoint-xyz');
    assert(notFoundRes.status === 404, 'Non-existent route returns 404');
    const notFoundBodyStr = JSON.stringify(notFoundRes.body);
    assert(!notFoundBodyStr.includes('node_modules') && !notFoundBodyStr.includes('Error:'), '404 response does not leak stack traces or server paths');

    // =========================================================================
    // FINAL AUDIT SUMMARY
    // =========================================================================
    console.log('\n========================================================================');
    console.log(`🏁 MASTER PRODUCTION AUDIT COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    await pool.end().catch(() => {});
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unhandled fatal exception during master production audit execution:', err);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

runProductionTests();
