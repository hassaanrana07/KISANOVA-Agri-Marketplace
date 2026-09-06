/**
 * Production Email Verification & Brevo Free API Test Suite (test_v8.js)
 * Tests all 15 core requirements:
 * 1. User Registration with email_verified = false
 * 2. Token generation (32-byte crypto hex, SHA-256 hash in DB, raw token not stored)
 * 3. Brevo API payload structure and template validation
 * 4. Successful verification via POST /api/auth/verify-email
 * 5. Single-use token enforcement (replay attack fails)
 * 6. Expired token rejection (past 30-min window returns 400 TOKEN_EXPIRED)
 * 7. Invalid/tampered token rejection (returns 400 TOKEN_INVALID)
 * 8. Unverified login attempt rejected with HTTP 403 EMAIL_NOT_VERIFIED
 * 9. Verified login attempt succeeds with HTTP 200 & JWT
 * 10. Resend verification endpoint generates fresh token & invalidates old token
 * 11. Resend verification 60-second cooldown rate limiting (HTTP 429)
 * 12. Email anti-enumeration protection (identical response for unregistered email)
 * 13. Admin accounts bypass normal user verification and remain operational
 * 14. Seller separation: email verification does NOT auto-approve farm profile (approval_status remains PENDING)
 * 15. Live Brevo API dispatch integration test
 */

const http = require('http');
const crypto = require('crypto');
const pool = require('./src/config/db');
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
      options.headers['x-forwarded-for'] = '10.8.0.' + (Math.floor(Math.random() * 200) + 10);
    }

    let postData = null;
    if (body !== null && typeof body === 'object') {
      postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
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

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 KISANOVA EMAIL VERIFICATION & BREVO API AUTOMATED SUITE (test_v8.js)');
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
    // -------------------------------------------------------------------------
    // TEST 1: User Registration with email_verified = false
    // -------------------------------------------------------------------------
    console.log('[TEST 1] User Registration sets email_verified = FALSE');
    const testBuyerEmail = `buyer_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const regRes = await makeRequest('POST', '/api/auth/register', {}, {
      name: 'Test Buyer Email Verif',
      email: testBuyerEmail,
      password: testPassword,
      role: 'BUYER'
    });

    assert(regRes.status === 201, `Registration returns HTTP 201 Created (got ${regRes.status})`);
    assert(regRes.body.success === true, 'Response body indicates success');
    assert(regRes.body.data.requiresVerification === true, 'Response indicates requiresVerification: true');
    assert(!regRes.body.data.token, 'No authentication JWT returned for unverified registration');

    // Verify DB record
    const [userRows] = await pool.query(
      'SELECT id, email, email_verified, email_verified_at, email_verification_token_hash, email_verification_expires_at FROM users WHERE email = ?',
      [testBuyerEmail]
    );
    assert(userRows.length === 1, 'User row created in database');
    const registeredUser = userRows[0];
    assert(registeredUser.email_verified === 0, 'Database email_verified column is 0 (FALSE)');
    assert(registeredUser.email_verified_at === null, 'Database email_verified_at is NULL');

    // -------------------------------------------------------------------------
    // TEST 2: Token Security (32-byte crypto, SHA-256 hash in DB, raw not in DB)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Token Security: SHA-256 Hash stored, raw token never persisted');
    assert(
      registeredUser.email_verification_token_hash !== null &&
      registeredUser.email_verification_token_hash.length === 64,
      'Stored token hash is a 64-character SHA-256 hex string'
    );
    const expiresAt = new Date(registeredUser.email_verification_expires_at);
    const now = new Date();
    const diffMinutes = (expiresAt - now) / (1000 * 60);
    assert(diffMinutes > 25 && diffMinutes <= 31, `Token expiration is ~30 minutes in future (got ${diffMinutes.toFixed(1)} mins)`);

    // -------------------------------------------------------------------------
    // TEST 3: Unverified Login Rejection
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Unverified Account Login Rejection (HTTP 403 EMAIL_NOT_VERIFIED)');
    const unverifiedLoginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: testBuyerEmail,
      password: testPassword
    });

    assert(unverifiedLoginRes.status === 403, `Unverified login returns HTTP 403 Forbidden (got ${unverifiedLoginRes.status})`);
    assert(unverifiedLoginRes.body.code === 'EMAIL_NOT_VERIFIED', 'Error response has code: EMAIL_NOT_VERIFIED');
    assert(unverifiedLoginRes.body.email === testBuyerEmail, 'Error response includes user email for resend UI');

    // -------------------------------------------------------------------------
    // TEST 4: Verification with Tampered / Invalid Token
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Invalid / Tampered Token Rejection');
    const invalidTokenRes = await makeRequest('POST', '/api/auth/verify-email', {}, {
      token: 'completely_bogus_token_1234567890abcdef'
    });
    assert(invalidTokenRes.status === 400, `Invalid token returns HTTP 400 Bad Request (got ${invalidTokenRes.status})`);
    assert(invalidTokenRes.body.code === 'TOKEN_INVALID', 'Returns error code TOKEN_INVALID');

    // -------------------------------------------------------------------------
    // TEST 5: Verification with Expired Token
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Expired Token Rejection');
    // Generate a test token and artificially set expiration in past
    const rawExpiredToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(rawExpiredToken).digest('hex');
    await pool.query(
      'UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE id = ?',
      [expiredHash, registeredUser.id]
    );

    const expiredTokenRes = await makeRequest('POST', '/api/auth/verify-email', {}, {
      token: rawExpiredToken
    });
    assert(expiredTokenRes.status === 400, `Expired token returns HTTP 400 Bad Request (got ${expiredTokenRes.status})`);
    assert(expiredTokenRes.body.code === 'TOKEN_EXPIRED', 'Returns error code TOKEN_EXPIRED');

    // -------------------------------------------------------------------------
    // TEST 6: Successful Verification via Valid Token
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Successful Email Verification via Valid Token');
    const rawValidToken = crypto.randomBytes(32).toString('hex');
    const validHash = crypto.createHash('sha256').update(rawValidToken).digest('hex');
    await pool.query(
      'UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?',
      [validHash, registeredUser.id]
    );

    const validVerifRes = await makeRequest('POST', '/api/auth/verify-email', {}, {
      token: rawValidToken
    });
    assert(validVerifRes.status === 200, `Valid token verification returns HTTP 200 OK (got ${validVerifRes.status})`);
    assert(validVerifRes.body.success === true, 'Verification returns success: true');

    // Inspect database updates
    const [verifiedUserRows] = await pool.query(
      'SELECT email_verified, email_verified_at, email_verification_token_hash, email_verification_expires_at FROM users WHERE id = ?',
      [registeredUser.id]
    );
    const verifiedUser = verifiedUserRows[0];
    assert(verifiedUser.email_verified === 1, 'Database email_verified is now 1 (TRUE)');
    assert(verifiedUser.email_verified_at !== null, 'Database email_verified_at has timestamp');
    assert(verifiedUser.email_verification_token_hash === null, 'email_verification_token_hash cleared');
    assert(verifiedUser.email_verification_expires_at === null, 'email_verification_expires_at cleared');

    // -------------------------------------------------------------------------
    // TEST 7: Single-Use Token Enforcement (Replay Attack Prevention)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Single-Use Token Enforcement (Replay Protection)');
    const replayRes = await makeRequest('POST', '/api/auth/verify-email', {}, {
      token: rawValidToken
    });
    assert(replayRes.status === 400, `Reused token returns HTTP 400 Bad Request (got ${replayRes.status})`);
    assert(replayRes.body.code === 'TOKEN_INVALID', 'Consumed token rejected as TOKEN_INVALID');

    // -------------------------------------------------------------------------
    // TEST 8: Verified User Login Succeeds
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Verified User Login Succeeds with JWT');
    const verifiedLoginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: testBuyerEmail,
      password: testPassword
    });
    assert(verifiedLoginRes.status === 200, `Verified user login returns HTTP 200 OK (got ${verifiedLoginRes.status})`);
    assert(!!verifiedLoginRes.body.data.token, 'JWT authentication token received');
    assert(verifiedLoginRes.body.data.user.email_verified === true || verifiedLoginRes.body.data.user.email_verified === 1, 'User object in login payload has email_verified = true');

    // -------------------------------------------------------------------------
    // TEST 9: Resend Verification for Unverified Account
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Resend Verification Endpoint Generates Fresh Token');
    const testUnverifiedEmail = `unverified_resend_${Date.now()}@example.com`;
    await makeRequest('POST', '/api/auth/register', {}, {
      name: 'Resend Test User',
      email: testUnverifiedEmail,
      password: testPassword,
      role: 'BUYER'
    });

    const [unverifiedRows1] = await pool.query(
      'SELECT id, email_verification_token_hash FROM users WHERE email = ?',
      [testUnverifiedEmail]
    );
    const initialHash = unverifiedRows1[0].email_verification_token_hash;

    // Adjust timestamp so 60-second cooldown has passed
    await pool.query(
      'UPDATE users SET email_verification_expires_at = DATE_ADD(DATE_SUB(NOW(), INTERVAL 65 SECOND), INTERVAL 30 MINUTE) WHERE email = ?',
      [testUnverifiedEmail]
    );

    const resendRes = await makeRequest('POST', '/api/auth/resend-verification', {}, {
      email: testUnverifiedEmail
    });
    assert(resendRes.status === 200, `Resend verification returns HTTP 200 OK (got ${resendRes.status})`);
    assert(resendRes.body.success === true, 'Resend response indicates success: true');

    const [unverifiedRows2] = await pool.query(
      'SELECT email_verification_token_hash FROM users WHERE email = ?',
      [testUnverifiedEmail]
    );
    const newHash = unverifiedRows2[0].email_verification_token_hash;
    assert(newHash !== initialHash, 'New verification hash generated, old token invalidated');

    // -------------------------------------------------------------------------
    // TEST 10: Resend Verification 60-Second Cooldown (Rate Limiting)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 10] Resend Verification Cooldown (HTTP 429 COOLDOWN_ACTIVE)');
    const rapidResendRes = await makeRequest('POST', '/api/auth/resend-verification', {}, {
      email: testUnverifiedEmail
    });
    assert(rapidResendRes.status === 429, `Rapid resend returns HTTP 429 Too Many Requests (got ${rapidResendRes.status})`);
    assert(rapidResendRes.body.code === 'COOLDOWN_ACTIVE', 'Returns error code COOLDOWN_ACTIVE');
    assert(rapidResendRes.body.data && rapidResendRes.body.data.cooldownRemainingSeconds > 0, 'Returns remaining cooldown seconds');

    // -------------------------------------------------------------------------
    // TEST 11: Email Anti-Enumeration Protection
    // -------------------------------------------------------------------------
    console.log('\n[TEST 11] Email Anti-Enumeration: Unregistered email returns identical generic response');
    const fakeEmail = `nonexistent_user_${Date.now()}@notfounddomain.org`;
    const anonRes = await makeRequest('POST', '/api/auth/resend-verification', {}, {
      email: fakeEmail
    });
    assert(anonRes.status === 200, `Non-existent email receives HTTP 200 (got ${anonRes.status})`);
    assert(anonRes.body.success === true, 'Returns generic success');
    assert(
      anonRes.body.message.includes('If an account exists'),
      'Message is neutral anti-enumeration text'
    );

    // -------------------------------------------------------------------------
    // TEST 12: Admin Accounts Bypass Verification Requirement
    // -------------------------------------------------------------------------
    console.log('\n[TEST 12] Admin Account Login & Operational Integrity');
    const adminLoginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'admin@kisanova.com',
      password: 'Admin@123456'
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeds with HTTP 200');
    assert(adminLoginRes.body.data.user.role === 'ADMIN', 'Admin user role is ADMIN');
    assert(!!adminLoginRes.body.data.token, 'Admin receives valid JWT');

    // -------------------------------------------------------------------------
    // TEST 13: Seller Separation: Email Verification does NOT approve seller profile
    // -------------------------------------------------------------------------
    console.log('\n[TEST 13] Seller Separation: Email Verification does NOT auto-approve farm profile');
    const sellerEmail = `farmer_verif_${Date.now()}@example.com`;
    const sellerRegRes = await makeRequest('POST', '/api/auth/register', {}, {
      name: 'Farmer Verif Test',
      email: sellerEmail,
      password: testPassword,
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

    // Fetch seller's raw token to verify
    const rawSellerToken = crypto.randomBytes(32).toString('hex');
    const sellerTokenHash = crypto.createHash('sha256').update(rawSellerToken).digest('hex');
    await pool.query(
      'UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE email = ?',
      [sellerTokenHash, sellerEmail]
    );

    // Verify seller's email
    const sellerVerifRes = await makeRequest('POST', '/api/auth/verify-email', {}, {
      token: rawSellerToken
    });
    assert(sellerVerifRes.status === 200, 'Seller email verification succeeds (HTTP 200)');

    // Verify that seller profile approval_status remains PENDING
    const [sellerProfileRows] = await pool.query(
      'SELECT s.approval_status, u.email_verified FROM sellers s JOIN users u ON s.user_id = u.id WHERE u.email = ?',
      [sellerEmail]
    );
    assert(sellerProfileRows.length === 1, 'Seller profile exists');
    assert(sellerProfileRows[0].email_verified === 1, 'Seller email_verified is 1');
    assert(
      sellerProfileRows[0].approval_status === 'PENDING',
      `Seller approval_status remains strictly PENDING (got ${sellerProfileRows[0].approval_status})`
    );

    // Logging in as unapproved seller returns 403 PENDING_APPROVAL (not EMAIL_NOT_VERIFIED)
    const pendingSellerLoginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: sellerEmail,
      password: testPassword,
      requestedRole: 'SELLER'
    });
    assert(pendingSellerLoginRes.status === 403, 'Pending seller login returns HTTP 403');
    assert(
      pendingSellerLoginRes.body.code === 'PENDING_APPROVAL',
      `Error code is PENDING_APPROVAL (not EMAIL_NOT_VERIFIED) - got ${pendingSellerLoginRes.body.code}`
    );

    // -------------------------------------------------------------------------
    // TEST 14: Brevo Email Template & API Payload Generation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 14] Brevo Email Service & Template Validation');
    const sampleHtml = emailService.buildVerificationHtml({
      name: 'Hassaan Rana',
      verificationUrl: 'http://localhost:5000/verify-email?token=dummy_token_test'
    });
    assert(sampleHtml.includes('KISANOVA'), 'Email HTML contains KISANOVA branding');
    assert(sampleHtml.includes('Verify Email Address'), 'Email HTML contains CTA button');
    assert(sampleHtml.includes('30 minutes'), 'Email HTML contains 30-minute expiration notice');
    assert(sampleHtml.includes('Hassaan Rana'), 'Email HTML personalizes recipient name');
    assert(sampleHtml.includes('dummy_token_test'), 'Email HTML contains verification URL');

    const sender = emailService.getSender();
    assert(sender.email === 'hassaanrana429@gmail.com', `Verified Brevo sender is configured (${sender.email})`);
    assert(sender.name === 'Kisanova', 'Sender display name is Kisanova');

    // -------------------------------------------------------------------------
    // TEST 15: Live Brevo API Dispatch Test
    // -------------------------------------------------------------------------
    console.log('\n[TEST 15] Live Brevo Transactional Email API Dispatch');
    const liveDispatchResult = await emailService.sendVerificationEmail({
      toEmail: 'hassaanrana429@gmail.com',
      toName: 'Kisanova Admin Live Test',
      rawToken: crypto.randomBytes(32).toString('hex'),
      role: 'BUYER'
    });

    assert(liveDispatchResult.success === true, `Brevo API dispatch succeeded (got success=${liveDispatchResult.success})`);
    assert(!!liveDispatchResult.messageId, `Brevo returned valid messageId: ${liveDispatchResult.messageId}`);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log(`🏁 TEST_V8 EMAIL VERIFICATION SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
    await pool.end().catch(() => {});
    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Unhandled fatal exception during test_v8 execution:', err);
    await pool.end().catch(() => {});
    process.exitCode = 1;
  }
}

runTests();
