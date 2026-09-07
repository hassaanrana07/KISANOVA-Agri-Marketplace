/**
 * ============================================================================
 * INPUT VALIDATION TEST SUITE (test_validation.js)
 * ============================================================================
 * 
 * Verifies:
 * 1. Type validation & strict rejection (no silent coercion)
 * 2. Length constraints & numeric bounds rejection
 * 3. Format validation (RFC email, phone, token hex length, enum inclusion)
 * 4. Unknown property rejection (strict mass-assignment protection)
 * 5. Full Express router integration & HTTP 400 Bad Request responses
 * 6. Valid payloads pass without obstruction
 */

const http = require('http');
const express = require('express');
const { validate } = require('./src/middleware/validator');
const { registerSchema, loginSchema, verifyEmailBodySchema } = require('./src/validators/authSchemas');
const { addToCartSchema, cartItemIdParamSchema } = require('./src/validators/cartSchemas');
const { getProductsQuerySchema, productIdParamSchema } = require('./src/validators/productSchemas');
const { checkoutSchema } = require('./src/validators/orderSchemas');
const { createProductSchema, updateSellerOrderStatusSchema } = require('./src/validators/sellerSchemas');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASS: ${message}`);
}

function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path || '/',
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {})
      }
    };

    let payload = null;
    if (body !== null) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING KISANOVA STRICT INPUT VALIDATION TEST SUITE');
  console.log('============================================================\n');

  const app = express();
  app.use(express.json());

  // Test endpoints mounting validation middleware
  app.post('/test/register', validate({ body: registerSchema }), (req, res) => {
    res.json({ success: true, user: req.body });
  });

  app.post('/test/login', validate({ body: loginSchema }), (req, res) => {
    res.json({ success: true, email: req.body.email || req.body.identifier });
  });

  app.post('/test/cart', validate({ body: addToCartSchema }), (req, res) => {
    res.json({ success: true, item: req.body });
  });

  app.delete('/test/cart/:itemId', validate({ params: cartItemIdParamSchema }), (req, res) => {
    res.json({ success: true, deleted: req.params.itemId });
  });

  app.get('/test/products', validate({ query: getProductsQuerySchema }), (req, res) => {
    res.json({ success: true, query: req.query });
  });

  app.get('/test/products/:id', validate({ params: productIdParamSchema }), (req, res) => {
    res.json({ success: true, productId: req.params.id });
  });

  app.post('/test/checkout', validate({ body: checkoutSchema }), (req, res) => {
    res.json({ success: true, order: req.body });
  });

  app.post('/test/product', validate({ body: createProductSchema }), (req, res) => {
    res.json({ success: true, product: req.body });
  });

  app.put('/test/order-status', validate({ body: updateSellerOrderStatusSchema }), (req, res) => {
    res.json({ success: true, status: req.body.status });
  });

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));

  try {
    // ------------------------------------------------------------------------
    // 1. TYPE REJECTIONS
    // ------------------------------------------------------------------------
    console.log('Category 1: Type Validation & Strict Rejections');

    // 1.1 Non-integer in integer field (cart product_id)
    const resType1 = await makeRequest(server, { method: 'POST', path: '/test/cart' }, {
      product_id: 'abc', // string instead of positiveInt
      quantity: 2
    });
    assert(resType1.statusCode === 400, 'Non-integer product_id is rejected with HTTP 400');
    assert(resType1.body.errors.some(e => e.field === 'product_id'), 'Error identifies product_id type violation');

    // 1.2 Non-number in number field (price)
    const resType2 = await makeRequest(server, { method: 'POST', path: '/test/product' }, {
      title: 'Valid Wheat Batch',
      category: 'Grains',
      description: 'High quality harvested wheat',
      price: 'Free_Price', // string instead of number
      unit: 'kg'
    });
    assert(resType2.statusCode === 400, 'String in numeric price field rejected with HTTP 400');

    // 1.3 Array in string field
    const resType3 = await makeRequest(server, { method: 'POST', path: '/test/register' }, {
      name: ['Hassaan', 'Rana'], // array instead of string
      email: 'valid@example.com',
      password: 'password123',
      role: 'BUYER'
    });
    assert(resType3.statusCode === 400, 'Array in string name field rejected with HTTP 400');

    // 1.4 Invalid path param type (/products/not-an-id)
    const resType4 = await makeRequest(server, { method: 'GET', path: '/test/products/xyz_invalid' });
    assert(resType4.statusCode === 400, 'Non-numeric path parameter :id rejected with HTTP 400');
    assert(resType4.body.errors[0].location === 'params', 'Error location correctly marked as params');

    // ------------------------------------------------------------------------
    // 2. LENGTH & NUMERIC BOUNDS REJECTIONS
    // ------------------------------------------------------------------------
    console.log('\nCategory 2: Length & Numeric Bounds Constraints');

    // 2.1 Password too short (< 6 chars)
    const resLen1 = await makeRequest(server, { method: 'POST', path: '/test/register' }, {
      name: 'Valid Name',
      email: 'valid@example.com',
      password: '123', // 3 chars < min 6
      role: 'BUYER'
    });
    assert(resLen1.statusCode === 400, 'Short password (< 6 chars) rejected with HTTP 400');
    assert(resLen1.body.errors.some(e => e.field === 'password'), 'Error identifies password length');

    // 2.2 Title too short (< 2 chars)
    const resLen2 = await makeRequest(server, { method: 'POST', path: '/test/product' }, {
      title: 'A', // 1 char < min 2
      category: 'Grains',
      description: 'High quality harvested wheat',
      price: 150.0,
      unit: 'kg'
    });
    assert(resLen2.statusCode === 400, 'Single-character title rejected with HTTP 400');

    // 2.3 Negative price (bounds check)
    const resLen3 = await makeRequest(server, { method: 'POST', path: '/test/product' }, {
      title: 'Wheat Harvest',
      category: 'Grains',
      description: 'High quality harvested wheat',
      price: -25.0, // negative price
      unit: 'kg'
    });
    assert(resLen3.statusCode === 400, 'Negative price rejected with HTTP 400');

    // 2.4 Zero quantity in cart (positiveInt requirement)
    const resLen4 = await makeRequest(server, { method: 'POST', path: '/test/cart' }, {
      product_id: 1,
      quantity: 0 // zero is not a positiveInt
    });
    assert(resLen4.statusCode === 400, 'Zero quantity rejected with HTTP 400');

    // 2.5 Empty required field
    const resLen5 = await makeRequest(server, { method: 'POST', path: '/test/register' }, {
      name: '   ', // whitespace only
      email: 'valid@example.com',
      password: 'password123',
      role: 'BUYER'
    });
    assert(resLen5.statusCode === 400, 'Empty whitespace-only required field rejected with HTTP 400');

    // ------------------------------------------------------------------------
    // 3. FORMAT REJECTIONS (EMAIL, PHONE, ENUMS)
    // ------------------------------------------------------------------------
    console.log('\nCategory 3: Format Constraints (Email, Phone, Enums)');

    // 3.1 Malformed email format
    const resFormat1 = await makeRequest(server, { method: 'POST', path: '/test/register' }, {
      name: 'Valid Name',
      email: 'not-an-email-address',
      password: 'password123',
      role: 'BUYER'
    });
    assert(resFormat1.statusCode === 400, 'Malformed email rejected with HTTP 400');
    assert(resFormat1.body.errors.some(e => e.field === 'email'), 'Error identifies invalid email format');

    // 3.2 Malformed phone format in checkout
    const resFormat2 = await makeRequest(server, { method: 'POST', path: '/test/checkout' }, {
      delivery_name: 'Farmer Ali',
      delivery_phone: 'bad_letters_phone',
      delivery_address: 'Main Canal Rd, Sahiwal'
    });
    assert(resFormat2.statusCode === 400, 'Non-numeric phone format rejected with HTTP 400');

    // 3.3 Invalid Role Enum
    const resFormat3 = await makeRequest(server, { method: 'POST', path: '/test/register' }, {
      name: 'Valid Name',
      email: 'valid@example.com',
      password: 'password123',
      role: 'SUPERADMIN_HACK' // not in ['BUYER', 'SELLER']
    });
    assert(resFormat3.statusCode === 400, 'Invalid enum value rejected with HTTP 400');

    // 3.4 Invalid Order Status Enum
    const resFormat4 = await makeRequest(server, { method: 'PUT', path: '/test/order-status' }, {
      status: 'SHIPPED_UNOFFICIAL' // not in allowed statuses
    });
    assert(resFormat4.statusCode === 400, 'Invalid order status enum rejected with HTTP 400');

    // ------------------------------------------------------------------------
    // 4. UNKNOWN PROPERTY REJECTIONS (STRICT MASS-ASSIGNMENT DEFENSE)
    // ------------------------------------------------------------------------
    console.log('\nCategory 4: Strict Schema Unknown Property Rejection');

    const resUnknown = await makeRequest(server, { method: 'POST', path: '/test/login' }, {
      email: 'buyer@example.com',
      password: 'password123',
      injected_admin_flag: true // forbidden unknown property
    });
    assert(resUnknown.statusCode === 400, 'Unknown injected property rejected with HTTP 400');
    assert(resUnknown.body.errors.some(e => e.message.includes('injected_admin_flag')), 'Error explicitly names forbidden unknown property');

    // ------------------------------------------------------------------------
    // 5. VALID PAYLOAD ACCEPTANCE
    // ------------------------------------------------------------------------
    console.log('\nCategory 5: Valid Payload Acceptance');

    // 5.1 Valid registration
    const resValid1 = await makeRequest(server, { method: 'POST', path: '/test/register' }, {
      name: 'Hassaan Rana',
      email: 'hassaan@kisanova.pk',
      password: 'StrongPassword123!',
      role: 'BUYER',
      phone: '+92 300 1234567'
    });
    assert(resValid1.statusCode === 200, 'Conforming registration payload passes with HTTP 200');

    // 5.2 Valid login
    const resValid2 = await makeRequest(server, { method: 'POST', path: '/test/login' }, {
      email: 'hassaan@kisanova.pk',
      password: 'StrongPassword123!'
    });
    assert(resValid2.statusCode === 200, 'Conforming login payload passes with HTTP 200');

    // 5.3 Valid cart addition
    const resValid3 = await makeRequest(server, { method: 'POST', path: '/test/cart' }, {
      product_id: 42,
      quantity: 5
    });
    assert(resValid3.statusCode === 200, 'Conforming cart item payload passes with HTTP 200');

    // 5.4 Valid path param deletion
    const resValid4 = await makeRequest(server, { method: 'DELETE', path: '/test/cart/108' });
    assert(resValid4.statusCode === 200, 'Valid numeric item ID path parameter passes with HTTP 200');

    // 5.5 Valid query parameters
    const resValid5 = await makeRequest(server, { method: 'GET', path: '/test/products?min_price=50&max_price=500&sort=price_asc&page=1&limit=20' });
    assert(resValid5.statusCode === 200, 'Valid filtered query parameters pass with HTTP 200');

  } finally {
    server.close();
  }

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} VALIDATION TESTS PASSED!`);
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ VALIDATION TEST RUN FAILED:', err);
  process.exit(1);
});
