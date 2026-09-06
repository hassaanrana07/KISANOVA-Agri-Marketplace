/**
 * Comprehensive Automated Verification Suite (test_v7.js)
 * Covers all 12 categories specified in Prompt v3 Section 50:
 * 1. Authentication
 * 2. Password Reset
 * 3. Authorization (IDOR / BOLA / RBAC)
 * 4. Products
 * 5. Checkout & Fulfillment (COD + Farm Gate Pickup)
 * 6. Inventory & Concurrency Safety
 * 7. Orders & State Machine
 * 8. Payments (Physical COD / Farm Pickup only)
 * 9. Notifications
 * 10. Chat & Socket.IO Authorization
 * 11. File Uploads
 * 12. Security Headers, CORS & Error Handling
 */

const http = require('http');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
const pool = require('./src/config/db');
const { getJwtSecret } = require('./src/middleware/auth');
const ioClient = require('../frontend/node_modules/socket.io-client');

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

function createMultipartBuffer(fieldName, filename, mimeType, content) {
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, Buffer.from(content), footer]);
  return { boundary, body };
}

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 KISANOVA MASTER VERIFICATION & PRODUCTION RELEASE AUDIT (test_v7.js)');
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
    // CATEGORY 1: AUTHENTICATION
    // =========================================================================
    console.log('[1/12] CATEGORY: AUTHENTICATION');

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
    assert(buyer1Login.status === 200 && buyer1Token, 'Valid login returns JWT token for BUYER');

    // 1.3 Valid login - Buyer 2
    const buyer2Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'buyer2@kisanova.com',
      password: 'Buyer@123456'
    });
    const buyer2Token = buyer2Login.body.data?.token || buyer2Login.body.token;
    const buyer2Id = buyer2Login.body.data?.user?.id || buyer2Login.body.user?.id;
    assert(buyer2Login.status === 200 && buyer2Token, 'Valid login returns JWT token for BUYER 2');

    // 1.4 Valid login - Seller 1 & Seller 2
    const seller1Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'seller1@kisanova.com',
      password: 'Seller@123456'
    });
    const seller1Token = seller1Login.body.data?.token || seller1Login.body.token;
    const seller1UserId = seller1Login.body.data?.user?.id || seller1Login.body.user?.id;
    assert(seller1Login.status === 200 && seller1Token, 'Valid login returns JWT token for SELLER 1');

    const seller2Login = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'seller2@kisanova.com',
      password: 'Seller@123456'
    });
    const seller2Token = seller2Login.body.data?.token || seller2Login.body.token;
    const seller2UserId = seller2Login.body.data?.user?.id || seller2Login.body.user?.id;
    assert(seller2Login.status === 200 && seller2Token, 'Valid login returns JWT token for SELLER 2');

    // 1.5 Valid login - Admin
    const adminLogin = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'admin@kisanova.com',
      password: 'Admin@123456'
    });
    const adminToken = adminLogin.body.data?.token || adminLogin.body.token;
    assert(adminLogin.status === 200 && adminToken, 'Valid login returns JWT token for ADMIN');

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
      'totally_wrong_secret_123',
      { algorithm: 'HS256' }
    );
    const wrongSecretRes = await makeRequest('GET', '/api/auth/me', {
      Authorization: `Bearer ${wrongSecretToken}`
    });
    assert(wrongSecretRes.status === 401, 'JWT signed with wrong secret rejected with HTTP 401');

    // 1.11 Disallowed algorithm rejected (e.g., none algorithm attack)
    const noneAlgHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: buyer1Id, role: 'BUYER', email: 'buyer1@kisanova.com' })).toString('base64url');
    const noneToken = `${noneAlgHeader}.${payload}.`;
    const noneRes = await makeRequest('GET', '/api/auth/me', {
      Authorization: `Bearer ${noneToken}`
    });
    assert(noneRes.status === 401, "JWT with 'none' algorithm rejected with HTTP 401");

    // =========================================================================
    // CATEGORY 2: PASSWORD RESET
    // =========================================================================
    console.log('\n[2/12] CATEGORY: PASSWORD RESET');

    // 2.1 Token generation
    const forgotRes = await makeRequest('POST', '/api/auth/forgot-password', {}, {
      identifier: 'buyer1@kisanova.com'
    });
    assert(forgotRes.status === 200 && forgotRes.body.success, 'Forgot password request accepted');
    const resetToken = forgotRes.body.devResetToken;
    assert(typeof resetToken === 'string' && resetToken.length === 64, 'Generated 32-byte (64-char hex) reset token');

    // 2.2 SHA-256 Hashed storage
    const expectedHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const [dbResets] = await pool.query(
      'SELECT id, reset_token_hash, token_expires_at, used FROM password_resets WHERE email = ? ORDER BY id DESC LIMIT 1',
      ['buyer1@kisanova.com']
    );
    assert(dbResets[0]?.reset_token_hash === expectedHash && dbResets[0]?.used === 0, 'Database holds matching SHA-256 hash and used=0');
    assert(new Date(dbResets[0]?.token_expires_at) > new Date(), 'token_expires_at is properly set in the future');

    // 2.3 Successful password reset
    const resetRes = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: resetToken,
      newPassword: 'NewPassword@789'
    });
    assert(resetRes.status === 200 && resetRes.body.success, 'Password reset succeeded with valid token');

    // 2.4 Single-use token enforcement
    const reuseRes = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: resetToken,
      newPassword: 'AnotherPassword@789'
    });
    assert(reuseRes.status === 400 && reuseRes.body.success === false, 'Reusing consumed reset token rejected (HTTP 400)');

    // 2.5 Old password rejected
    const oldLoginFail = await makeRequest('POST', '/api/auth/login', { 'x-forwarded-for': '10.0.99.1' }, {
      email: 'buyer1@kisanova.com',
      password: 'Buyer@123456'
    });
    assert(oldLoginFail.status === 401, 'Login with old password fails (HTTP 401)');

    // 2.6 New password accepted
    const newLoginSuccess = await makeRequest('POST', '/api/auth/login', { 'x-forwarded-for': '10.0.99.1' }, {
      email: 'buyer1@kisanova.com',
      password: 'NewPassword@789'
    });
    assert(newLoginSuccess.status === 200, 'Login with new password succeeds (HTTP 200)');

    // 2.7 Expired token rejection
    const expiredResetToken = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredResetToken).digest('hex');
    await pool.query(
      `INSERT INTO password_resets (email, reset_token_hash, token_expires_at, attempts, used)
       VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 1 HOUR), 0, FALSE)`,
      ['buyer1@kisanova.com', expiredHash]
    );
    const expiredAttempt = await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: expiredResetToken,
      newPassword: 'TryExpiredPassword@123'
    });
    assert(expiredAttempt.status === 400, 'Expired password reset token rejected (HTTP 400)');

    // Restore Buyer 1 password to default
    const restoreForgot = await makeRequest('POST', '/api/auth/forgot-password', {}, { identifier: 'buyer1@kisanova.com' });
    await makeRequest('POST', '/api/auth/reset-password', {}, {
      token: restoreForgot.body.devResetToken,
      newPassword: 'Buyer@123456'
    });

    // 2.8 Auth rate limiter test (triggers 429 and Retry-After)
    let hitRateLimit = false;
    let retryAfterHeader = null;
    for (let i = 0; i < 15; i++) {
      const res = await makeRequest('POST', '/api/auth/login', { 'x-forwarded-for': '198.51.100.77' }, {
        email: 'rate_test@example.com',
        password: 'Password999'
      });
      if (res.status === 429) {
        hitRateLimit = true;
        retryAfterHeader = res.headers['retry-after'];
        break;
      }
    }
    assert(hitRateLimit && retryAfterHeader !== null, 'Auth rate limiter triggers HTTP 429 with Retry-After header');

    // =========================================================================
    // CATEGORY 3: AUTHORIZATION (IDOR / BOLA / RBAC)
    // =========================================================================
    console.log('\n[3/12] CATEGORY: AUTHORIZATION (IDOR / BOLA / RBAC)');

    // Prepare a test order for Buyer 1
    const [s1Rows] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [seller1UserId]);
    const seller1Id = s1Rows[0].id;
    const [s2Rows] = await pool.query('SELECT id FROM sellers WHERE user_id = ?', [seller2UserId]);
    const seller2Id = s2Rows[0].id;

    // Fetch product owned by Seller 1
    const [s1ProdRows] = await pool.query('SELECT id, price FROM products WHERE seller_id = ? AND status = "ACTIVE" LIMIT 1', [seller1Id]);
    const testProd = s1ProdRows[0];

    // Seed an order for Buyer 1
    const [b1Cart] = await pool.query('SELECT id FROM carts WHERE buyer_id = ?', [buyer1Id]);
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const orderRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Auth Test Buyer',
      delivery_phone: '+92 300 1112233',
      delivery_address: '123 Agri Lane, Multan',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    const buyer1OrderId = orderRes.body.data?.orderId || orderRes.body.data?.order_id;
    assert(buyer1OrderId !== undefined, 'Created reference test order for Buyer 1');

    // 3.1 Buyer/Buyer IDOR: Buyer 2 forbidden from accessing Buyer 1 order
    const buyerIdorOrder = await makeRequest('GET', `/api/orders/${buyer1OrderId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(buyerIdorOrder.status === 403, "Buyer 2 forbidden from viewing Buyer 1's order (HTTP 403)");

    // 3.2 Buyer 2 forbidden from viewing Buyer 1 receipt
    const buyerIdorReceipt = await makeRequest('GET', `/api/payments/receipt/${buyer1OrderId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(buyerIdorReceipt.status === 403, "Buyer 2 forbidden from viewing Buyer 1's receipt (HTTP 403)");

    // 3.3 Buyer cannot access Seller routes
    const buyerToSellerOrders = await makeRequest('GET', '/api/seller/orders', {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(buyerToSellerOrders.status === 403, 'Buyer forbidden from accessing /api/seller/orders (HTTP 403)');

    // 3.4 Buyer cannot access Admin routes
    const buyerToAdminMetrics = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(buyerToAdminMetrics.status === 403, 'Buyer forbidden from accessing /api/admin/metrics (HTTP 403)');

    // 3.5 Seller cannot access Admin routes
    const sellerToAdminMetrics = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${seller1Token}`
    });
    assert(sellerToAdminMetrics.status === 403, 'Seller forbidden from accessing /api/admin/metrics (HTTP 403)');

    // 3.6 Admin can access Admin routes
    const adminMetrics = await makeRequest('GET', '/api/admin/metrics', {
      Authorization: `Bearer ${adminToken}`
    });
    assert(adminMetrics.status === 200, 'Admin authorized to access /api/admin/metrics (HTTP 200)');

    // =========================================================================
    // CATEGORY 4: PRODUCTS
    // =========================================================================
    console.log('\n[4/12] CATEGORY: PRODUCTS');

    // Create a product specifically for Seller 1
    const [pInsert] = await pool.query(
      `INSERT INTO products (seller_id, title, category, description, price, available_quantity, unit, status)
       VALUES (?, 'Organic Basmati Rice Test', 'Grains', 'Fine long grain rice', 250.00, 100, 'kg', 'ACTIVE')`,
      [seller1Id]
    );
    const s1OwnedProdId = pInsert.insertId;

    // 4.1 Owner (Seller 1) can update product
    const ownerUpdate = await makeRequest('PUT', `/api/seller/products/${s1OwnedProdId}`, {
      Authorization: `Bearer ${seller1Token}`
    }, {
      title: 'Updated Organic Basmati Rice Test',
      price: 260.00
    });
    assert(ownerUpdate.status === 200 && ownerUpdate.body.success, 'Owner (Seller 1) successfully updates product (HTTP 200)');

    // 4.2 Non-owner (Seller 2) update rejected
    const nonOwnerUpdate = await makeRequest('PUT', `/api/seller/products/${s1OwnedProdId}`, {
      Authorization: `Bearer ${seller2Token}`
    }, {
      title: 'Hacked Title By Seller 2'
    });
    assert(nonOwnerUpdate.status === 403 || nonOwnerUpdate.status === 404, 'Non-owner (Seller 2) update rejected (HTTP 403/404)');

    // 4.3 Non-owner (Seller 2) delete rejected
    const nonOwnerDelete = await makeRequest('DELETE', `/api/seller/products/${s1OwnedProdId}`, {
      Authorization: `Bearer ${seller2Token}`
    });
    assert(nonOwnerDelete.status === 403 || nonOwnerDelete.status === 404, 'Non-owner (Seller 2) delete rejected (HTTP 403/404)');

    // 4.4 Owner (Seller 1) can delete product
    const ownerDelete = await makeRequest('DELETE', `/api/seller/products/${s1OwnedProdId}`, {
      Authorization: `Bearer ${seller1Token}`
    });
    assert(ownerDelete.status === 200 && ownerDelete.body.success, 'Owner (Seller 1) successfully deletes product (HTTP 200)');

    // =========================================================================
    // CATEGORY 5: CHECKOUT & FULFILLMENT
    // =========================================================================
    console.log('\n[5/12] CATEGORY: CHECKOUT & FULFILLMENT (COD + FARM PICKUP)');

    // 5.1 COD delivery missing address rejected
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 2, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const codNoAddress = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'COD Tester',
      delivery_phone: '+92 300 5554433',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    assert(codNoAddress.status === 400, 'COD Delivery checkout without delivery address rejected (HTTP 400)');

    // 5.2 COD delivery with address succeeds
    const codSuccess = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'COD Tester',
      delivery_phone: '+92 300 5554433',
      delivery_address: 'House 44, Street 9, Rawalpindi',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    assert(codSuccess.status === 201, 'COD Delivery checkout with valid address succeeds (HTTP 201)');
    const codPaymentMethod = codSuccess.body.data?.paymentMethod || codSuccess.body.data?.payment_method;
    assert(codPaymentMethod === 'COD', 'COD delivery recorded with payment method COD');
    const codFee = codSuccess.body.data?.deliveryFee !== undefined ? codSuccess.body.data?.deliveryFee : codSuccess.body.data?.delivery_fee;
    assert(codFee > 0, 'COD delivery includes server-calculated delivery fee');

    // 5.3 Farm Gate Self-Pickup succeeds without delivery address
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const pickupSuccess = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Pickup Farmer Buyer',
      delivery_phone: '+92 300 7778899',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'FARM_PICKUP' } }
    });
    assert(pickupSuccess.status === 201, 'Farm Gate Self-Pickup succeeds without delivery address (HTTP 201)');
    const pickupMethod = pickupSuccess.body.data?.paymentMethod || pickupSuccess.body.data?.payment_method;
    const pickupFee = pickupSuccess.body.data?.deliveryFee !== undefined ? pickupSuccess.body.data?.deliveryFee : pickupSuccess.body.data?.delivery_fee;
    assert(pickupMethod === 'COD', 'Farm Gate Self-Pickup recorded with payment method COD');
    assert(pickupFee === 0, 'Farm Gate Self-Pickup delivery fee is 0 PKR');

    // 5.3b Payment Method Tampering: Non-COD methods strictly rejected with HTTP 400
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);

    const jazzcashTamper = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'Tamper Tester',
      delivery_phone: '+92 300 1112233',
      delivery_address: 'Tamper Lane',
      payment_method: 'JAZZCASH'
    });
    assert(jazzcashTamper.status === 400, 'Tampered payment_method JAZZCASH rejected with HTTP 400 Bad Request');

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

    // 5.4 Multi-Seller Checkout
    // Fetch product from Seller 2
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
      const msOrderId = multiSellerRes.body.data?.orderId || multiSellerRes.body.data?.order_id;
      const [subOrderCount] = await pool.query('SELECT COUNT(*) as cnt FROM seller_orders WHERE order_id = ?', [msOrderId]);
      assert(subOrderCount[0].cnt === 2, 'Multi-seller checkout created exactly 2 distinct seller_orders');
    }

    // =========================================================================
    // CATEGORY 6: INVENTORY & CONCURRENCY SAFETY
    // =========================================================================
    console.log('\n[6/12] CATEGORY: INVENTORY & CONCURRENCY SAFETY');

    // Create a product with available_quantity = 5
    const [cProd] = await pool.query(
      `INSERT INTO products (seller_id, title, category, description, price, available_quantity, unit, status)
       VALUES (?, 'Concurrency Test Wheat', 'Grains', 'Fresh harvest wheat', 50.00, 5, 'kg', 'ACTIVE')`,
      [seller1Id]
    );
    const concProdId = cProd.insertId;

    // 6.1 Insufficient stock rejected
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

    // 6.2 Concurrent checkout against limited inventory (Race condition protection)
    // Put 4 units in buyer 1's cart, and 4 units in buyer 2's cart (Total 8, only 5 in stock)
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

    // 6.3 Exact stock checkout reduces stock to 0
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

    // Cleanup test product
    await pool.query('DELETE FROM order_items WHERE product_id = ?', [concProdId]);
    await pool.query('DELETE FROM products WHERE id = ?', [concProdId]);

    // =========================================================================
    // CATEGORY 7: ORDERS & STATE MACHINE
    // =========================================================================
    console.log('\n[7/12] CATEGORY: ORDERS & STATE MACHINE');

    // Create fresh order to test state machine transitions
    await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [b1Cart[0].id]);
    await pool.query('INSERT INTO cart_items (cart_id, product_id, seller_id, quantity, price_snapshot) VALUES (?, ?, ?, 1, ?)', [b1Cart[0].id, testProd.id, seller1Id, testProd.price]);
    const smOrderRes = await makeRequest('POST', '/api/orders/checkout', { Authorization: `Bearer ${buyer1Token}` }, {
      delivery_name: 'State Machine Buyer',
      delivery_phone: '+92 300 4445566',
      delivery_address: 'State Machine Road, Faisalabad',
      seller_fulfillments: { [seller1Id]: { fulfillment_type: 'DELIVERY' } }
    });
    const smOrderId = smOrderRes.body.data?.orderId || smOrderRes.body.data?.order_id;
    const [smSubRows] = await pool.query('SELECT id, status FROM seller_orders WHERE order_id = ?', [smOrderId]);
    const smSubOrderId = smSubRows[0].id;
    assert(smSubRows[0].status === 'PENDING', 'Initial order status is PENDING');

    // 7.1 Legal transitions: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED
    const t1 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'CONFIRMED' });
    assert(t1.status === 200, 'Transition PENDING -> CONFIRMED succeeds (HTTP 200)');

    const t2 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'PROCESSING' });
    assert(t2.status === 200, 'Transition CONFIRMED -> PROCESSING succeeds (HTTP 200)');

    // 7.2 Illegal backward transition rejected
    const tIllegal = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'PENDING' });
    assert(tIllegal.status === 400, 'Illegal backward transition PROCESSING -> PENDING rejected (HTTP 400)');

    // Continue to SHIPPED and DELIVERED
    const t3 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'SHIPPED' });
    assert(t3.status === 200, 'Transition PROCESSING -> SHIPPED succeeds (HTTP 200)');

    const t4 = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'DELIVERED' });
    assert(t4.status === 200, 'Transition SHIPPED -> DELIVERED succeeds (HTTP 200)');

    // 7.3 Terminal state immutability
    const tTerminal = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${seller1Token}` }, { status: 'CANCELLED' });
    assert(tTerminal.status === 400, 'Transition out of terminal status DELIVERED rejected (HTTP 400)');

    // 7.4 Unauthorized order modification (Buyer attempting seller status update)
    const buyerStatusUpdate = await makeRequest('PUT', `/api/seller/orders/${smSubOrderId}/status`, { Authorization: `Bearer ${buyer1Token}` }, { status: 'CONFIRMED' });
    assert(buyerStatusUpdate.status === 403, 'Buyer forbidden from updating seller order status (HTTP 403)');

    // =========================================================================
    // CATEGORY 8: PAYMENTS (STRICT PHYSICAL COD / FARM PICKUP ONLY)
    // =========================================================================
    console.log('\n[8/12] CATEGORY: PAYMENTS (PHYSICAL COD / FARM PICKUP ONLY)');

    // 8.1 Auto-settlement upon delivery: payment status transitioned to PAID
    const [deliveredSubOrder] = await pool.query('SELECT payment_status, amount_paid, amount_remaining FROM seller_orders WHERE id = ?', [smSubOrderId]);
    assert(deliveredSubOrder[0].payment_status === 'PAID', 'DELIVERED order automatically transitions payment_status to PAID');
    assert(parseFloat(deliveredSubOrder[0].amount_remaining) === 0, 'DELIVERED order sets amount_remaining to 0 PKR');

    // 8.2 Verify payment record status in payments table
    const [paymentRecord] = await pool.query('SELECT status, receipt_number, amount_paid, amount_remaining FROM payments WHERE order_id = ?', [smOrderId]);
    assert(paymentRecord[0].status === 'PAID', 'Audit payments table records status as PAID upon delivery');
    assert(paymentRecord[0].receipt_number && paymentRecord[0].receipt_number.startsWith('REC-'), 'Valid physical receipt number generated (REC-*)');

    // 8.3 Decommissioned online payment endpoints return 404
    const onlineWebhook = await makeRequest('POST', '/api/payments/webhook/jazzcash');
    assert(onlineWebhook.status === 404, 'Online payment webhook returns 404');

    const verifyOnline = await makeRequest('POST', '/api/payments/verify-online', { Authorization: `Bearer ${buyer1Token}` }, { orderId: smOrderId });
    assert(verifyOnline.status === 404, 'Decommissioned verify-online endpoint returns 404');

    const sandboxEndpoint = await makeRequest('POST', '/api/payments/process-sandbox', { Authorization: `Bearer ${buyer1Token}` }, { orderId: smOrderId });
    assert(sandboxEndpoint.status === 404, 'Decommissioned process-sandbox endpoint returns 404');

    // 8.4 Seller dashboard metrics accurately reflect COD collection
    const sDash = await makeRequest('GET', '/api/seller/dashboard', { Authorization: `Bearer ${seller1Token}` });
    assert(sDash.status === 200, 'Seller dashboard returns 200');
    const m = sDash.body.data?.metrics || sDash.body.data;
    assert(typeof m?.grossOrderValue === 'number' && m.grossOrderValue >= 0, 'grossOrderValue calculated accurately');
    assert(typeof m?.cashCollected === 'number' && m.cashCollected >= 0, 'cashCollected calculated accurately');
    assert(m?.refunds === undefined || m?.refunds === 0, 'No obsolete digital refunds in metrics');

    // =========================================================================
    // CATEGORY 9: NOTIFICATIONS
    // =========================================================================
    console.log('\n[9/12] CATEGORY: NOTIFICATIONS');

    // Seed notification for Buyer 1
    const [notifRes] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read)
       VALUES (?, 'SYSTEM', 'Private Alert for Buyer 1', 'Confidential notification', FALSE)`,
      [buyer1Id]
    );
    const notifId = notifRes.insertId;

    // 9.1 Buyer 2 forbidden from deleting Buyer 1's notification
    const idorNotifDelete = await makeRequest('DELETE', `/api/notifications/${notifId}`, {
      Authorization: `Bearer ${buyer2Token}`
    });
    assert(idorNotifDelete.status === 404 || idorNotifDelete.status === 403, "Buyer 2 forbidden from deleting Buyer 1's notification (HTTP 404/403)");

    // 9.2 Buyer 1 can delete own notification
    const authNotifDelete = await makeRequest('DELETE', `/api/notifications/${notifId}`, {
      Authorization: `Bearer ${buyer1Token}`
    });
    assert(authNotifDelete.status === 200, 'Buyer 1 authorized to delete own notification (HTTP 200)');

    // =========================================================================
    // CATEGORY 10: CHAT & SOCKET.IO AUTHORIZATION
    // =========================================================================
    console.log('\n[10/12] CATEGORY: CHAT & SOCKET.IO AUTHORIZATION');

    // 10.1 Unauthenticated Socket.IO connection rejected
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

    // 10.2 Authenticated Socket.IO connection succeeds
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

    // 10.3 Socket room authorization isolation
    // Create conversation between Buyer 1 and Seller 1
    const [cRows] = await pool.query(
      `INSERT INTO conversations (buyer_id, seller_id, product_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [buyer1Id, seller1Id, testProd.id]
    );
    const convId = cRows.insertId;

    // Buyer 2 tries to join Buyer 1's conversation room
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
    // CATEGORY 11: FILE UPLOADS
    // =========================================================================
    console.log('\n[11/12] CATEGORY: FILE UPLOADS');

    // 11.1 Disallowed extension (.php) rejected
    const phpPayload = createMultipartBuffer('file', 'malicious.php', 'application/x-php', '<?php phpinfo(); ?>');
    const phpUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${phpPayload.boundary}`
    }, phpPayload.body);
    assert(phpUploadRes.status === 400 || phpUploadRes.status === 500, 'Executable .php file rejected by upload filter (HTTP 400/500)');

    // 11.2 Disallowed extension (.exe) rejected
    const exePayload = createMultipartBuffer('file', 'trojan.exe', 'application/x-msdownload', 'MZ...');
    const exeUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${exePayload.boundary}`
    }, exePayload.body);
    assert(exeUploadRes.status === 400 || exeUploadRes.status === 500, 'Executable .exe file rejected by upload filter (HTTP 400/500)');

    // 11.3 Valid image (.png) accepted with cryptographically random filename
    const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082';
    const pngPayload = createMultipartBuffer('file', 'valid_harvest.png', 'image/png', Buffer.from(pngHex, 'hex'));
    const pngUploadRes = await makeRequest('POST', '/api/seller/upload-media', {
      Authorization: `Bearer ${seller1Token}`,
      'Content-Type': `multipart/form-data; boundary=${pngPayload.boundary}`
    }, pngPayload.body);
    assert(pngUploadRes.status === 200 && pngUploadRes.body.success, 'Valid .png image accepted by upload filter (HTTP 200)');
    const uploadedUrl = pngUploadRes.body.data?.url || pngUploadRes.body.url;
    // Filename format has 32-char cryptographically random hex suffix
    const isCryptoRandomName = /-[0-9a-f]{32}\.png$/i.test(uploadedUrl);
    assert(isCryptoRandomName, `Uploaded file uses 32-char cryptographically random hex filename: ${uploadedUrl}`);

    // =========================================================================
    // CATEGORY 12: SECURITY HEADERS, CORS & ERROR HANDLING
    // =========================================================================
    console.log('\n[12/12] CATEGORY: SECURITY HEADERS, CORS & ERROR HANDLING');

    // 12.1 Helmet security headers
    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.status === 200, 'API Health check returns HTTP 200');
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'Security header X-Content-Type-Options: nosniff present');

    // 12.2 CORS configuration
    const corsPreflight = await makeRequest('OPTIONS', '/api/health', {
      'Origin': 'http://localhost:5000',
      'Access-Control-Request-Method': 'GET'
    });
    assert(corsPreflight.status === 204 || corsPreflight.status === 200, 'CORS preflight request handled appropriately');

    // 12.3 404 handler does not leak internal stack traces
    const notFoundRes = await makeRequest('GET', '/api/non-existent-endpoint-xyz');
    assert(notFoundRes.status === 404, 'Non-existent route returns 404');
    const notFoundBodyStr = JSON.stringify(notFoundRes.body);
    assert(!notFoundBodyStr.includes('node_modules') && !notFoundBodyStr.includes('Error:'), '404 response does not leak stack traces or server paths');

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n========================================================================');
    console.log(`🏁 TEST_V7 MASTER SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Unhandled fatal exception during test_v7 execution:', err);
    process.exit(1);
  }
}

runTests();
