/**
 * Comprehensive Automated Verification Suite (test_v6.js)
 * Tests all 12 security hardening and COD/Farm Pickup requirements.
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const pool = require('./src/config/db');
const { getJwtSecret } = require('./src/middleware/auth');
const ioClient = require('../frontend/node_modules/socket.io-client');

const BASE_URL = 'http://localhost:8000';

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
      options.headers['x-forwarded-for'] = '10.0.0.' + (Math.floor(Math.random() * 200) + 10);
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

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 STARTING KISANOVA MASTER VERIFICATION SUITE (test_v6.js)');
  console.log('===============================================================\n');

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
    // -------------------------------------------------------------
    // TEST 1: Fail-fast JWT Secret Configuration
    // -------------------------------------------------------------
    console.log('[1/12] Testing Fail-fast JWT Secret...');
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

    process.env.JWT_SECRET = 'valid_test_secret_12345';
    assert(getJwtSecret() === 'valid_test_secret_12345', 'getJwtSecret() returns configured secret');

    process.env.NODE_ENV = originalEnv;
    process.env.JWT_SECRET = originalSecret;

    // -------------------------------------------------------------
    // Authenticate test users
    // -------------------------------------------------------------
    console.log('\nAuthenticating test accounts...');
    const buyer1Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer1@kisanova.com',
      password: 'Buyer@123456'
    });
    const buyer1Token = buyer1Login.body.data?.token || buyer1Login.body.token;
    const buyer1Id = buyer1Login.body.data?.user?.id || buyer1Login.body.user?.id;
    assert(buyer1Login.status === 200 && buyer1Token, 'Buyer 1 login successful');

    const buyer2Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer2@kisanova.com',
      password: 'Buyer@123456'
    });
    const buyer2Token = buyer2Login.body.data?.token || buyer2Login.body.token;
    const buyer2Id = buyer2Login.body.data?.user?.id || buyer2Login.body.user?.id;
    assert(buyer2Login.status === 200 && buyer2Token, 'Buyer 2 login successful');

    const seller1Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'seller1@kisanova.com',
      password: 'Seller@123456'
    });
    const seller1Token = seller1Login.body.data?.token || seller1Login.body.token;
    assert(seller1Login.status === 200 && seller1Token, 'Seller 1 login successful');

    const seller2Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'seller2@kisanova.com',
      password: 'Seller@123456'
    });
    const seller2Token = seller2Login.body.data?.token || seller2Login.body.token;
    assert(seller2Login.status === 200 && seller2Token, 'Seller 2 login successful');

    // -------------------------------------------------------------
    // TEST 2: Pure Token-Based Password Reset
    // -------------------------------------------------------------
    console.log('\n[2/12] Testing Pure Token-Based Password Reset...');
    const forgotRes = await makeRequest('POST', '/api/auth/forgot-password', {}, {
      identifier: 'buyer1@kisanova.com'
    });
    assert(forgotRes.status === 200 && forgotRes.body.success, 'Forgot password request accepted');
    const resetToken = forgotRes.body.devResetToken;
    assert(typeof resetToken === 'string' && resetToken.length === 64, 'Generated 32-byte (64-char) hex cryptographic reset token');

    // Verify token hash stored in DB
    const expectedHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const [dbResets] = await pool.query(
      'SELECT id, reset_token_hash, used FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1',
      ['buyer1@kisanova.com']
    );
    assert(dbResets[0]?.reset_token_hash === expectedHash && dbResets[0]?.used === 0, 'Database holds matching SHA-256 hash and used=0');

    // Execute password reset
    const resetRes = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: resetToken,
      newPassword: 'NewBuyerPass@999'
    });
    assert(resetRes.status === 200 && resetRes.body.success, 'Password reset succeeded with valid token');

    // Verify single-use token enforcement (re-using same token must fail)
    const reuseRes = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: resetToken,
      newPassword: 'AnotherPassword@999'
    });
    assert(reuseRes.status === 400 && reuseRes.body.success === false, 'Reusing previously consumed reset token rejected (400)');

    // Verify old password fails and new password succeeds
    const oldLoginFail = await makeRequest('POST', '/api/auth/login', { 'x-forwarded-for': '10.0.10.5' }, {
      email: 'buyer1@kisanova.com',
      password: 'Buyer@123456'
    });
    if (oldLoginFail.status !== 401) {
      console.log('  [DEBUG] oldLoginFail status:', oldLoginFail.status, oldLoginFail.body);
    }
    assert(oldLoginFail.status === 401, 'Login with old password fails');

    const newLoginSuccess = await makeRequest('POST', '/api/auth/login', { 'x-forwarded-for': '10.0.10.5' }, {
      email: 'buyer1@kisanova.com',
      password: 'NewBuyerPass@999'
    });
    if (newLoginSuccess.status !== 200) {
      console.log('  [DEBUG] newLoginSuccess status:', newLoginSuccess.status, newLoginSuccess.body);
    }
    assert(newLoginSuccess.status === 200, 'Login with newly reset password succeeds');

    // Reset password back to Buyer@123456 for test cleanliness
    const forgotRes2 = await makeRequest('POST', '/api/auth/forgot-password', {}, { identifier: 'buyer1@kisanova.com' });
    await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: forgotRes2.body.devResetToken,
      newPassword: 'Buyer@123456'
    });
    console.log('  ℹ️  Buyer 1 credentials restored to default.');

    // -------------------------------------------------------------
    // TEST 4: Atomic Inventory Decrement & Race Condition Protection
    // -------------------------------------------------------------
    console.log('\n[4/12] Testing Atomic Inventory Decrement & Overselling Prevention...');
    // Create a temporary test crop with available_quantity = 5
    const [sellerRow] = await pool.query('SELECT id FROM sellers LIMIT 1');
    const [testProdRes] = await pool.query(
      `INSERT INTO products (seller_id, title, category, description, price, available_quantity, unit, status)
       VALUES (?, 'Race Condition Test Wheat', 'Grains', 'Fresh test harvest', 10.00, 5, 'kg', 'ACTIVE')`,
      [sellerRow[0].id]
    );
    const testProductId = testProdRes.insertId;

    // Concurrently try to checkout 4 units in request A and 4 units in request B (Total 8, but only 5 available)
    // Set cart for Buyer 1 and Buyer 2
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE buyer_id = ?)', [buyer1Id]);
    await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE buyer_id = ?)', [buyer2Id]);

    const [b1Cart] = await pool.query('SELECT id FROM carts WHERE buyer_id = ?', [buyer1Id]);
    const [b2Cart] = await pool.query('SELECT id FROM carts WHERE buyer_id = ?', [buyer2Id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 4, 10.00)', [b1Cart[0].id, testProductId, sellerRow[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 4, 10.00)', [b2Cart[0].id, testProductId, sellerRow[0].id]);

    // Send both checkout requests concurrently
    const [checkoutResA, checkoutResB] = await Promise.all([
      makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
        delivery_name: 'Zainab Ali',
        delivery_phone: '+92 300 1234567',
        delivery_address: 'Test Address Lahore'
      }),
      makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer2Token}` }, {
        delivery_name: 'David Miller',
        delivery_phone: '+92 300 7654321',
        delivery_address: 'Test Address Islamabad'
      })
    ]);

    const statuses = [checkoutResA.status, checkoutResB.status];
    assert(statuses.includes(201) && (statuses.includes(400) || statuses.includes(409)),
      'Concurrent checkout: exactly one transaction succeeded and second was rejected due to insufficient inventory');

    const [updatedProduct] = await pool.query('SELECT available_quantity FROM products WHERE id = ?', [testProductId]);
    assert(parseFloat(updatedProduct[0].available_quantity) === 1, `Inventory precisely decremented to 1 (5 - 4), actual: ${updatedProduct[0].available_quantity}`);

    // Cleanup test product & order items
    await pool.query('DELETE FROM order_items WHERE product_id = ?', [testProductId]);
    await pool.query('DELETE FROM products WHERE id = ?', [testProductId]);

    // -------------------------------------------------------------
    // TEST 5: COD vs Farm Gate Self-Pickup Checkout & Address Constraints
    // -------------------------------------------------------------
    console.log('\n[5/12] Testing COD vs Farm Gate Self-Pickup Fulfillment...');
    const [prodRows] = await pool.query('SELECT id, seller_id, available_quantity, price FROM products WHERE status = "ACTIVE" AND available_quantity >= 5 LIMIT 1');
    const validProd = prodRows[0];

    // 5A: Farm Pickup with no delivery address -> Should SUCCEED with fee = 0 and method = FARM_PICKUP
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, validProd.id, validProd.seller_id, validProd.price]);

    const farmPickupRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Farm Visitor',
      delivery_phone: '+92 300 9876543',
      seller_fulfillments: {
        [validProd.seller_id]: { fulfillment_type: 'FARM_PICKUP' }
      }
    });
    assert(farmPickupRes.status === 201, 'Farm Gate Self-Pickup checkout succeeds without delivery address');
    const pickupPaymentMethod = farmPickupRes.body.data?.paymentMethod || farmPickupRes.body.data?.payment_method;
    const pickupDeliveryFee = farmPickupRes.body.data?.deliveryFee !== undefined ? farmPickupRes.body.data?.deliveryFee : farmPickupRes.body.data?.delivery_fee;
    assert(pickupPaymentMethod === 'FARM_PICKUP', 'Parent order payment method recorded as FARM_PICKUP');
    assert(pickupDeliveryFee === 0, 'Farm Gate Self-Pickup delivery fee is 0');
    const pickupOrderId = farmPickupRes.body.data?.orderId || farmPickupRes.body.data?.order_id;

    // 5B: COD with missing delivery address -> Should FAIL (400)
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, validProd.id, validProd.seller_id, validProd.price]);

    const codMissingAddressRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'COD Buyer',
      delivery_phone: '+92 300 9876543',
      seller_fulfillments: {
        [validProd.seller_id]: { fulfillment_type: 'DELIVERY' }
      }
    });
    assert(codMissingAddressRes.status === 400, 'COD Delivery checkout without delivery address is rejected (400)');

    // 5C: COD with valid delivery address -> Should SUCCEED with method = COD
    const codValidRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'COD Buyer',
      delivery_phone: '+92 300 9876543',
      delivery_address: 'House 123, Street 4, Islamabad',
      seller_fulfillments: {
        [validProd.seller_id]: { fulfillment_type: 'DELIVERY' }
      }
    });
    assert(codValidRes.status === 201, 'COD Delivery checkout with valid address succeeds');
    const codPaymentMethod = codValidRes.body.data?.paymentMethod || codValidRes.body.data?.payment_method;
    assert(codPaymentMethod === 'COD', 'Payment method recorded as COD');
    const codOrderId = codValidRes.body.data?.orderId || codValidRes.body.data?.order_id;

    // -------------------------------------------------------------
    // TEST 6: IDOR Protection & Authorization Isolation
    // -------------------------------------------------------------
    console.log('\n[6/12] Testing IDOR Protections...');
    // Buyer 2 attempts to fetch Buyer 1's order
    const idorOrderRes = await makeRequest('GET', `/api/orders/${codOrderId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(idorOrderRes.status === 403, "Buyer 2 forbidden from accessing Buyer 1's order (HTTP 403)");

    // Buyer 2 attempts to fetch Buyer 1's receipt
    const idorReceiptRes = await makeRequest('GET', `/api/payments/receipt/${codOrderId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(idorReceiptRes.status === 403, "Buyer 2 forbidden from viewing Buyer 1's receipt (HTTP 403)");

    // -------------------------------------------------------------
    // TEST 7: Order State Machine Transitions
    // -------------------------------------------------------------
    console.log('\n[7/12] Testing Order State Machine Transitions...');
    // Get sub-order id of codOrderId
    const [subRows] = await pool.query('SELECT id, status, seller_id FROM seller_orders WHERE order_id = ?', [codOrderId]);
    const testSubOrder = subRows[0];
    const testSubOrderId = testSubOrder.id;

    // Verify Seller 1 can confirm (PENDING -> CONFIRMED)
    const confirmRes = await makeRequest('PUT', `/api/seller/orders/${testSubOrderId}/status`, {
      Authorization: `Bearer ${seller1Token}`
    }, { status: 'CONFIRMED' });
    assert(confirmRes.status === 200, 'Valid transition PENDING -> CONFIRMED accepted');

    // Verify CONFIRMED -> PROCESSING
    const procRes = await makeRequest('PUT', `/api/seller/orders/${testSubOrderId}/status`, {
      Authorization: `Bearer ${seller1Token}`
    }, { status: 'PROCESSING' });
    assert(procRes.status === 200, 'Valid transition CONFIRMED -> PROCESSING accepted');

    // Invalid transition: PROCESSING -> PENDING (backward)
    const invalidBackRes = await makeRequest('PUT', `/api/seller/orders/${testSubOrderId}/status`, {
      Authorization: `Bearer ${seller1Token}`
    }, { status: 'PENDING' });
    assert(invalidBackRes.status === 400, 'Invalid transition backward PROCESSING -> PENDING rejected (400)');

    // -------------------------------------------------------------
    // TEST 8: Terminal State Payment Settlement
    // -------------------------------------------------------------
    console.log('\n[8/12] Testing Terminal State Auto-Payment Settlement...');
    // Advance to SHIPPED -> DELIVERED
    await makeRequest('PUT', `/api/seller/orders/${testSubOrderId}/status`, {
      Authorization: `Bearer ${seller1Token}`
    }, { status: 'SHIPPED' });

    const deliverRes = await makeRequest('PUT', `/api/seller/orders/${testSubOrderId}/status`, {
      Authorization: `Bearer ${seller1Token}`
    }, { status: 'DELIVERED' });
    assert(deliverRes.status === 200, 'Transition SHIPPED -> DELIVERED accepted');

    // Verify payment_status became PAID automatically
    const [settledSubOrder] = await pool.query('SELECT payment_status FROM seller_orders WHERE id = ?', [testSubOrderId]);
    assert(settledSubOrder[0].payment_status === 'PAID', 'DELIVERED order automatically transitions payment_status to PAID');

    // Attempting further transition on terminal DELIVERED status should fail
    const terminalAttempt = await makeRequest('PUT', `/api/seller/orders/${testSubOrderId}/status`, {
      Authorization: `Bearer ${seller1Token}`
    }, { status: 'PROCESSING' });
    assert(terminalAttempt.status === 400, 'Terminal status DELIVERED is immutable (cannot transition further)');

    // -------------------------------------------------------------
    // TEST 9: Seller Metrics Accounting
    // -------------------------------------------------------------
    console.log('\n[9/12] Testing Seller Metrics Financial Accounting...');
    const metricsRes = await makeRequest('GET', '/api/seller/dashboard', {
      Authorization: `Bearer ${seller1Token}`
    });
    assert(metricsRes.status === 200, 'Seller dashboard metrics endpoint returned 200');
    const metrics = metricsRes.body.data?.metrics || metricsRes.body.data;
    assert(typeof metrics?.grossOrderValue === 'number', 'grossOrderValue calculated');
    assert(typeof metrics?.cashCollected === 'number', 'cashCollected calculated');
    assert(typeof metrics?.pendingCodAmount === 'number', 'pendingCodAmount calculated');
    assert(typeof metrics?.farmPickupAmount === 'number', 'farmPickupAmount calculated');
    assert(metrics?.refunds === undefined || metrics?.refunds === 0, 'No fake mock refund accounting');

    // -------------------------------------------------------------
    // TEST 10: Upload Whitelist & File Sanitization
    // -------------------------------------------------------------
    console.log('\n[10/12] Testing Media Upload Security Whitelist...');
    // Create multipart form boundary to test upload filter
    function createMultipartBuffer(fieldName, filename, mimeType, content) {
      const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
      const header = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      );
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([header, Buffer.from(content), footer]);
      return { boundary, body };
    }

    // Attempt uploading disallowed .php executable
    const badUpload = createMultipartBuffer('file', 'exploit.php', 'application/x-php', '<?php phpinfo(); ?>');
    const badUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${badUpload.boundary}`
    }, badUpload.body);
    assert(badUploadRes.status === 400 || badUploadRes.status === 500, 'Disallowed file extension .php rejected by upload filter');

    // Attempt uploading allowed .png image
    // Minimal 1x1 transparent PNG bytes
    const pngBytes = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    const goodUpload = createMultipartBuffer('file', 'test-harvest.png', 'image/png', pngBytes);
    const goodUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${goodUpload.boundary}`
    }, goodUpload.body);
    assert(goodUploadRes.status === 200 && goodUploadRes.body.success, 'Allowed image file .png accepted by upload filter');

    // -------------------------------------------------------------
    // TEST 11: Socket.IO Connection Handshake Authentication
    // -------------------------------------------------------------
    console.log('\n[11/12] Testing Socket.IO Handshake Authentication...');
    // Unauthenticated socket connection attempt
    const unauthConnected = await new Promise((resolve) => {
      const socket = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 3000
      });
      socket.on('connect', () => {
        socket.disconnect();
        resolve(true);
      });
      socket.on('connect_error', (err) => {
        socket.disconnect();
        resolve(false);
      });
    });
    assert(unauthConnected === false, 'Socket.IO handshake WITHOUT JWT token is rejected (connect_error)');

    // Authenticated socket connection with valid JWT
    const authSocket = await new Promise((resolve, reject) => {
      const socket = ioClient(BASE_URL, {
        transports: ['websocket'],
        reconnection: false,
        auth: { token: buyer1Token },
        timeout: 4000
      });
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => resolve(null));
    });
    assert(authSocket !== null && authSocket.connected, 'Socket.IO handshake with valid JWT connects successfully');

    // -------------------------------------------------------------
    // TEST 12: Socket.IO Room Authorization
    // -------------------------------------------------------------
    console.log('\n[12/12] Testing Socket.IO Conversation Room Authorization...');
    // Create conversation between Buyer 1 and Seller 1
    const [pRow] = await pool.query('SELECT id FROM products LIMIT 1');
    const [convRow] = await pool.query(
      `INSERT INTO conversations (buyer_id, seller_id, product_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [buyer1Id, sellerRow[0].id, pRow[0].id]
    );
    const conversationId = convRow.insertId;

    // Buyer 2 attempts to join Buyer 1's conversation
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

    const joinForbidden = await new Promise((resolve) => {
      buyer2Socket.emit('join_conversation', conversationId);
      buyer2Socket.on('error', (err) => {
        resolve(err.message.includes('authorized') || err.message.includes('Forbidden'));
      });
      setTimeout(() => resolve(false), 2000);
    });
    assert(joinForbidden, 'Non-participant (Buyer 2) unauthorized from joining conversation room');

    // Cleanup open sockets
    if (authSocket) authSocket.disconnect();
    if (buyer2Socket) buyer2Socket.disconnect();

    // -------------------------------------------------------------
    // TEST 12: Sliding-Window In-Memory Rate Limiting
    // -------------------------------------------------------------
    console.log('\n[12/12] Testing Auth Rate Limiting on /api/auth/login...');
    let hitRateLimit = false;
    for (let i = 0; i < 15; i++) {
      const res = await makeRequest('POST', '/api/auth/login', { 'x-forwarded-for': '198.51.100.99' }, {
        email: 'rate_limit_test@example.com',
        password: 'WrongPassword999'
      });
      if (res.status === 429) {
        hitRateLimit = true;
        break;
      }
    }
    assert(hitRateLimit, 'Rate limiter triggered HTTP 429 on excessive auth attempts');

    // -------------------------------------------------------------
    // TEST 13: Product Ownership Enforcement
    // -------------------------------------------------------------
    console.log('\n[13/17] Testing Product Ownership Enforcement...');
    const seller1UserId = seller1Login.body.data?.user?.id || seller1Login.body.user?.id;
    const [s1Rows] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [seller1UserId]);
    const seller1Id = s1Rows[0]?.id;
    
    // Fetch a product owned by Seller 1
    const [seller1Products] = await pool.query('SELECT id, title FROM products WHERE seller_id = ? LIMIT 1', [seller1Id]);
    if (seller1Products.length > 0) {
      const s1ProdId = seller1Products[0].id;
      // Seller 2 attempts to edit Seller 1's product
      const editAttempt = await makeRequest('PUT', `/api/seller/products/${s1ProdId}`, {
        Authorization: `Bearer ${seller2Token}`
      }, {
        title: 'Hacked Title By Seller 2'
      });
      assert(editAttempt.status === 404 || editAttempt.status === 403, 'Seller 2 forbidden from modifying Seller 1 product (HTTP 404/403)');

      // Seller 2 attempts to delete Seller 1's product
      const deleteAttempt = await makeRequest('DELETE', `/api/seller/products/${s1ProdId}`, {
        Authorization: `Bearer ${seller2Token}`
      });
      assert(deleteAttempt.status === 404 || deleteAttempt.status === 403, 'Seller 2 forbidden from deleting Seller 1 product (HTTP 404/403)');
    }

    // -------------------------------------------------------------
    // TEST 14: Role-Based Authorization Enforcement
    // -------------------------------------------------------------
    console.log('\n[14/17] Testing Role-Based Route Protection...');
    // Buyer accessing seller dashboard
    const buyerToSeller = await makeRequest('GET', '/api/seller/orders', {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(buyerToSeller.status === 403, 'Buyer forbidden from seller endpoints (HTTP 403)');

    // Buyer accessing admin metrics
    const buyerToAdmin = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(buyerToAdmin.status === 403, 'Buyer forbidden from admin endpoints (HTTP 403)');

    // Seller accessing admin metrics
    const sellerToAdmin = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${seller1Token}`
    });
    assert(sellerToAdmin.status === 403, 'Seller forbidden from admin endpoints (HTTP 403)');

    // -------------------------------------------------------------
    // TEST 15: Expired JWT Security
    // -------------------------------------------------------------
    console.log('\n[15/17] Testing Expired JWT Token Handling...');
    const expiredToken = jwt.sign(
      { id: buyer1Id, role: 'BUYER', email: 'buyer1@kisanova.com' },
      getJwtSecret(),
      { expiresIn: '-1s' }
    );
    const expiredRes = await makeRequest('GET', '/api/auth/me', {
      Authorization: `Bearer ${expiredToken}`
    });
    assert(expiredRes.status === 401, 'Expired JWT token rejected with HTTP 401');

    // -------------------------------------------------------------
    // TEST 16: Purged Obsolete Payment Endpoints Return 404
    // -------------------------------------------------------------
    console.log('\n[16/17] Testing Purged Payment Endpoints (Zero Online Gateways)...');
    const webhookRes = await makeRequest('POST', '/api/payments/webhook/jazzcash', {
      Authorization: `Bearer ${buyer1Token}`
    }, { data: 'test' });
    assert(webhookRes.status === 404, 'Decommissioned webhook endpoint returns 404');

    const verifyOnlineRes = await makeRequest('POST', '/api/payments/verify-online', {
      Authorization: `Bearer ${buyer1Token}`
    }, { orderId: 1 });
    assert(verifyOnlineRes.status === 404, 'Decommissioned verify-online endpoint returns 404');

    const sandboxRes = await makeRequest('POST', '/api/payments/process-sandbox', {
      Authorization: `Bearer ${buyer1Token}`
    }, { orderId: 1 });
    assert(sandboxRes.status === 404, 'Decommissioned process-sandbox endpoint returns 404');

    const adminVerifyRes = await makeRequest('PUT', '/api/admin/payments/1/verify', {
      Authorization: `Bearer ${seller1Token}`
    }, { isApproved: true });
    assert(adminVerifyRes.status === 404 || adminVerifyRes.status === 403, 'Decommissioned admin bank verify returns 404/403');

    // -------------------------------------------------------------
    // TEST 17: Notification Ownership Scoping
    // -------------------------------------------------------------
    console.log('\n[17/17] Testing Notification Ownership Authorization...');
    // Seed a notification for Buyer 1
    const [notifInsert] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read)
       VALUES (?, 'SYSTEM', 'Test Security Notice', 'Buyer 1 private notification', FALSE)`,
      [buyer1Id]
    );
    const notifId = notifInsert.insertId;

    // Buyer 2 attempts to delete Buyer 1's notification
    const unauthorizedDelete = await makeRequest('DELETE', `/api/notifications/${notifId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(unauthorizedDelete.status === 404, 'Buyer 2 forbidden from deleting Buyer 1 notification (HTTP 404)');

    // Buyer 1 successfully deletes own notification
    const authorizedDelete = await makeRequest('DELETE', `/api/notifications/${notifId}`, {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(authorizedDelete.status === 200, 'Buyer 1 authorized to delete own notification (HTTP 200)');

    console.log('\n===============================================================');
    console.log(`🏁 VERIFICATION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unhandled exception during verification run:', err);
    process.exit(1);
  }
}

runTests();
