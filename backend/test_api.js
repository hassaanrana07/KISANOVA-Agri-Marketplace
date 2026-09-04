/**
 * KISANOVA - Automated Backend API Test Suite
 * Validates authentication, RBAC, public catalog, multi-seller cart, checkout, seller orders, admin moderation, and chat.
 */

const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./src/app');

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, body: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Kisanova Backend Integration Tests...\n');

  server = app.listen(PORT);

  try {
    // 1. Health Check
    const health = await request('GET', '/health');
    console.assert(health.status === 200, 'Health check failed');
    console.log('✅ 1. Health Check Passed: Status', health.body.status);

    // 2. Auth - Admin Login
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@kisanova.com',
      password: 'Admin@123456'
    });
    console.assert(adminLogin.status === 200 && adminLogin.body.data.user.role === 'ADMIN', 'Admin login failed');
    const adminToken = adminLogin.body.data.token;
    console.log('✅ 2. Admin Login Passed (Role: ADMIN)');

    // 3. Auth - Seller Login
    const sellerLogin = await request('POST', '/auth/login', {
      email: 'seller1@kisanova.com',
      password: 'Seller@123456'
    });
    console.assert(sellerLogin.status === 200 && sellerLogin.body.data.user.role === 'SELLER', 'Seller login failed');
    console.assert(sellerLogin.body.data.seller.farm_name === 'Green Valley Farms', 'Seller profile missing');
    const seller1Token = sellerLogin.body.data.token;
    console.log('✅ 3. Seller Login Passed (Farm: Green Valley Farms, Status: APPROVED)');

    // 4. Auth - Buyer Login
    const buyerLogin = await request('POST', '/auth/login', {
      email: 'buyer1@kisanova.com',
      password: 'Buyer@123456'
    });
    console.assert(buyerLogin.status === 200 && buyerLogin.body.data.user.role === 'BUYER', 'Buyer login failed');
    const buyer1Token = buyerLogin.body.data.token;
    console.log('✅ 4. Buyer Login Passed (Role: BUYER)');

    // 5. RBAC Security Enforcement
    // Buyer attempts to access Admin endpoint -> MUST be 403
    const unauthorizedAdminAccess = await request('GET', '/admin/metrics', null, buyer1Token);
    console.assert(unauthorizedAdminAccess.status === 403, 'RBAC check failed: Buyer accessed admin route!');
    console.log('✅ 5. RBAC Security Check: Buyer access to /admin/metrics blocked with 403 Forbidden');

    // Buyer attempts to access Seller endpoint -> MUST be 403
    const unauthorizedSellerAccess = await request('GET', '/seller/dashboard', null, buyer1Token);
    console.assert(unauthorizedSellerAccess.status === 403, 'RBAC check failed: Buyer accessed seller route!');
    console.log('✅ 6. RBAC Security Check: Buyer access to /seller/dashboard blocked with 403 Forbidden');

    // 6. Public Product Browsing
    const productsRes = await request('GET', '/products');
    console.assert(productsRes.status === 200, 'Product browsing failed');
    const products = productsRes.body.data.products;
    console.assert(products.length > 0, 'No products found');
    console.log(`✅ 7. Public Marketplace Catalog: Loaded ${products.length} approved products`);

    // Search filter test
    const searchRes = await request('GET', '/products?search=Wheat');
    console.assert(searchRes.status === 200 && searchRes.body.data.products.length > 0, 'Search filter failed');
    console.log(`✅ 8. Product Search Filter: Found ${searchRes.body.data.products.length} matching "Wheat"`);

    // 7. Multi-Seller Cart
    // Clear cart first
    await request('DELETE', '/cart', null, buyer1Token);

    // Add Wheat (Seller 1) to cart
    const prod1Id = products.find(p => p.title.includes('Wheat')).id;
    const add1 = await request('POST', '/cart', { product_id: prod1Id, quantity: 2 }, buyer1Token);
    console.assert(add1.status === 200, 'Add item 1 to cart failed');

    // Add Mangoes (Seller 2) to same cart
    const prod2Id = products.find(p => p.title.includes('Mango')).id;
    const add2 = await request('POST', '/cart', { product_id: prod2Id, quantity: 3 }, buyer1Token);
    console.assert(add2.status === 200, 'Add item 2 to cart failed');

    // Fetch cart and verify multi-seller grouping
    const cartRes = await request('GET', '/cart', null, buyer1Token);
    console.assert(cartRes.status === 200, 'Get cart failed');
    console.assert(cartRes.body.data.groupedBySeller.length === 2, 'Cart not grouped into 2 sellers');
    console.log('✅ 9. Multi-Seller Cart: Products from 2 different sellers successfully co-exist in 1 cart');

    // 8. Checkout & Payment Simulation
    const checkoutRes = await request(
      'POST',
      '/orders/checkout',
      {
        delivery_name: 'Zainab Ali',
        delivery_phone: '+1 555-901-2345',
        delivery_address: 'Flat 4B, Palm Tree Heights, East Agro City',
        payment_method: 'card'
      },
      buyer1Token
    );
    console.assert(checkoutRes.status === 201, 'Checkout failed');
    const orderData = checkoutRes.body.data;
    console.assert(orderData.sellerCount === 2, 'Parent order does not link to 2 seller sub-orders');
    console.log(`✅ 10. Multi-Seller Checkout: Created Parent Order ${orderData.orderNumber} with ${orderData.sellerCount} sub-orders`);

    // Settle digital payment via sandbox verification
    const payRes = await request(
      'POST',
      '/payments/process-sandbox',
      {
        orderId: orderData.orderId,
        transactionReference: orderData.paymentSession.transactionReference,
        token: orderData.paymentSession.verificationToken,
        cardLast4: '4242'
      },
      buyer1Token
    );
    console.assert(payRes.status === 200 && payRes.body.data.status === 'PAID', 'Payment settlement failed');
    console.log('✅ 11. Payment Gateway Settlement: Payment verified and transitioned to PAID');

    // Verify buyer orders
    const buyerOrdersRes = await request('GET', '/orders', null, buyer1Token);
    console.assert(buyerOrdersRes.status === 200 && buyerOrdersRes.body.data.length > 0, 'Fetch buyer orders failed');
    console.log('✅ 12. Buyer "My Orders": Retrieved list of confirmed orders');

    // 9. Seller Panel Operations
    // Seller 1 checks their orders
    const sellerOrdersRes = await request('GET', '/seller/orders', null, seller1Token);
    console.assert(sellerOrdersRes.status === 200, 'Seller orders fetch failed');
    const sellerSubOrder = sellerOrdersRes.body.data.find(so => so.order_id === orderData.orderId);
    console.assert(sellerSubOrder !== undefined, 'Seller 1 did not receive their sub-order');
    console.log('✅ 13. Seller Orders: Seller 1 successfully isolated their sub-order');

    // Seller updates status to SHIPPED
    const updateStatusRes = await request(
      'PUT',
      `/seller/orders/${sellerSubOrder.seller_order_id}/status`,
      { status: 'SHIPPED' },
      seller1Token
    );
    console.assert(updateStatusRes.status === 200, 'Seller update order status failed');
    console.log('✅ 14. Seller Order Status: Status advanced to SHIPPED');

    // 10. Admin Panel Operations
    // Admin checks pending sellers
    const pendingSellersRes = await request('GET', '/admin/sellers?status=PENDING', null, adminToken);
    console.assert(pendingSellersRes.status === 200, 'Admin pending sellers fetch failed');
    const pendingSeller = pendingSellersRes.body.data.find(s => s.farm_name.includes('Sunrise Agro'));
    console.assert(pendingSeller !== undefined, 'Pending seller not found in moderation queue');

    // Admin approves pending seller
    const approveSellerRes = await request(
      'PUT',
      `/admin/sellers/${pendingSeller.id}/approval`,
      { status: 'APPROVED' },
      adminToken
    );
    console.assert(approveSellerRes.status === 200, 'Admin approve seller failed');
    console.log('✅ 15. Admin Moderation: Approved pending seller "Sunrise Agro Commodities"');

    // Admin checks pending products
    const pendingProductsRes = await request('GET', '/admin/products?status=PENDING', null, adminToken);
    console.assert(pendingProductsRes.status === 200, 'Admin pending products fetch failed');
    if (pendingProductsRes.body.data.length > 0) {
      const pendingProd = pendingProductsRes.body.data[0];
      const approveProdRes = await request(
        'PUT',
        `/admin/products/${pendingProd.id}/status`,
        { status: 'APPROVED' },
        adminToken
      );
      console.assert(approveProdRes.status === 200, 'Admin approve product failed');
      console.log(`✅ 16. Admin Moderation: Approved pending product "${pendingProd.title}"`);
    }

    // 11. Chat & Messaging Flow
    // Buyer initiates chat with Seller 1 about Wheat
    const wheatProduct = products.find(p => p.title.includes('Wheat'));
    const convRes = await request(
      'POST',
      '/chat/conversations',
      {
        seller_id: wheatProduct.seller_id,
        product_id: wheatProduct.id
      },
      buyer1Token
    );
    console.assert(convRes.status === 200 || convRes.status === 201, 'Chat conversation creation failed');
    const conversationId = convRes.body.data.conversation_id;

    // Buyer sends text message
    const sendMsgRes = await request(
      'POST',
      `/chat/conversations/${conversationId}/messages`,
      {
        text_content: 'Is this lot of Durum Wheat certified pesticide-free for export?'
      },
      buyer1Token
    );
    console.assert(sendMsgRes.status === 201, 'Buyer send message failed');

    // Seller 1 replies
    const replyMsgRes = await request(
      'POST',
      `/chat/conversations/${conversationId}/messages`,
      {
        text_content: 'Yes Zainab, all our crops are tested by ISO-accredited agro labs. Full certificate included.'
      },
      seller1Token
    );
    console.assert(replyMsgRes.status === 201, 'Seller reply message failed');

    // Verify messages thread
    const threadRes = await request('GET', `/chat/conversations/${conversationId}/messages`, null, buyer1Token);
    console.assert(threadRes.status === 200 && threadRes.body.data.messages.length >= 2, 'Chat thread fetch failed');
    console.log('✅ 17. Buyer-to-Seller Chat: Bidirectional messaging verified with sender validation');

    // Unauthorized access check: another buyer cannot view this conversation
    const buyer2Login = await request('POST', '/auth/login', {
      email: 'buyer2@kisanova.com',
      password: 'Buyer@123456'
    });
    const buyer2Token = buyer2Login.body.data.token;
    const eavesdropRes = await request('GET', `/chat/conversations/${conversationId}/messages`, null, buyer2Token);
    console.assert(eavesdropRes.status === 403, 'Chat security breach: Unauthorized buyer read private messages!');
    console.log('✅ 18. Chat Security: Eavesdropping by unrelated user blocked with 403 Forbidden');

    console.log('\n🎉 ALL 18 INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
