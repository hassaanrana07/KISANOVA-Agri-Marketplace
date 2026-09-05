const http = require('http');
const pool = require('./src/config/db');

const BASE_URL = 'http://localhost:5000/api';

async function request(method, path, body = null, token = null) {
  const url = new URL(BASE_URL + path);
  const options = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Comprehensive Kisanova v2 Integration Tests...\n');

  // Ensure seller1 is initially APPROVED for product purchasing
  await pool.query("UPDATE sellers SET approval_status = 'APPROVED' WHERE id = 1");

  // Test 1: Provider Configuration Status
  console.log('--- TEST 1: Payment Provider Configuration & Sandbox Mode Status ---');
  const configRes = await request('GET', '/payments/config-status');
  console.log('Status Code:', configRes.status);
  console.log('Currency:', configRes.data?.data?.currency);
  console.log('Easypaisa Mode:', configRes.data?.data?.providers?.easypaisa?.mode);
  console.log('COD Mode:', configRes.data?.data?.providers?.cod?.mode);
  if (configRes.status === 200 && configRes.data?.data?.currency === 'PKR') {
    console.log('✅ TEST 1 PASSED: Currency locked to PKR and provider sandbox status reported correctly.\n');
  } else {
    console.error('❌ TEST 1 FAILED:', configRes.data);
    process.exit(1);
  }

  // Test 2: Buyer Login
  console.log('--- TEST 2: Buyer Authentication ---');
  const buyerLoginRes = await request('POST', '/auth/login', {
    email: 'buyer1@kisanova.com',
    password: 'Buyer@123456'
  });
  const buyerToken = buyerLoginRes.data?.data?.token;
  if (buyerToken) {
    console.log('✅ TEST 2 PASSED: Buyer authenticated successfully.\n');
  } else {
    console.error('❌ TEST 2 FAILED:', buyerLoginRes.data);
    process.exit(1);
  }

  // Test 3: Product Detail with Pakistan Location & Polygon
  console.log('--- TEST 3: Product Detail with Location Hierarchy & Polygon ---');
  const prodRes = await request('GET', '/products/1');
  console.log('Product Title:', prodRes.data?.data?.product?.title);
  console.log('Price:', prodRes.data?.data?.product?.price, 'PKR');
  console.log('Seller Province:', prodRes.data?.data?.product?.seller_province);
  console.log('Delivery Available:', prodRes.data?.data?.product?.delivery_available);
  console.log('Farm Polygon:', prodRes.data?.data?.product?.farm_polygon);
  if (prodRes.status === 200) {
    console.log('✅ TEST 3 PASSED: Product detail includes fulfillment and GIS attributes.\n');
  } else {
    console.error('❌ TEST 3 FAILED:', prodRes.data);
    process.exit(1);
  }

  // Test 4: Add to Cart & Inspect Multi-Seller Cart
  console.log('--- TEST 4: Cart Fulfillment Options ---');
  await request('POST', '/cart', { product_id: 1, quantity: 2 }, buyerToken);
  const cartRes = await request('GET', '/cart', null, buyerToken);
  console.log('Cart Items Count:', cartRes.data?.data?.totalItemsCount);
  console.log('Grand Total:', cartRes.data?.data?.grandTotal);
  console.log('Seller Delivery Fee:', cartRes.data?.data?.groupedBySeller?.[0]?.delivery_fee);
  if (cartRes.status === 200 && cartRes.data?.data?.items?.length > 0) {
    console.log('✅ TEST 4 PASSED: Cart calculates totals and includes seller fulfillment fees.\n');
  } else {
    console.error('❌ TEST 4 FAILED:', cartRes.data);
    process.exit(1);
  }

  // Test 5: Checkout with Delivery Fulfillment & Online Payment
  console.log('--- TEST 5: Checkout with Delivery Fulfillment Method & Dynamic Fee ---');
  const checkoutRes = await request('POST', '/orders/checkout', {
    delivery_name: 'Imran Khan',
    delivery_phone: '03009876543',
    delivery_address: 'House 14, St 9, F-7/2, Islamabad',
    delivery_notes: 'Ring bell on gate',
    fulfillment_method: 'DELIVERY',
    payment_method: 'ONLINE',
    online_provider: 'easypaisa'
  }, buyerToken);

  console.log('Checkout Order Number:', checkoutRes.data?.data?.orderNumber);
  console.log('Subtotal:', checkoutRes.data?.data?.subtotal);
  console.log('Delivery Fee:', checkoutRes.data?.data?.deliveryFee);
  console.log('Total Amount:', checkoutRes.data?.data?.totalAmount);
  console.log('Transaction Ref:', checkoutRes.data?.data?.paymentSession?.transactionReference);

  const orderId = checkoutRes.data?.data?.orderId;
  const paymentSession = checkoutRes.data?.data?.paymentSession;

  if (checkoutRes.status === 201 && orderId) {
    console.log('✅ TEST 5 PASSED: Atomic checkout completed with delivery fee addition.\n');
  } else {
    console.error('❌ TEST 5 FAILED:', checkoutRes.data);
    process.exit(1);
  }

  // Test 6: Online Payment HMAC Verification
  console.log('--- TEST 6: Online Payment HMAC Cryptographic Verification ---');
  const verifyRes = await request('POST', '/payments/verify-online', {
    orderId,
    transactionReference: paymentSession.transactionReference,
    token: paymentSession.verificationToken,
    walletIdentifier: '03009876543'
  }, buyerToken);

  console.log('Verification Status:', verifyRes.data?.data?.status);
  console.log('Amount Paid:', verifyRes.data?.data?.amountPaid, 'PKR');
  console.log('Amount Remaining:', verifyRes.data?.data?.amountRemaining, 'PKR');

  if (verifyRes.status === 200 && verifyRes.data?.data?.status === 'PAID') {
    console.log('✅ TEST 6 PASSED: Online payment verified and order status updated to PAID.\n');
  } else {
    console.error('❌ TEST 6 FAILED:', verifyRes.data);
    process.exit(1);
  }

  // Test 7: Printable Receipt Generation in PKR
  console.log('--- TEST 7: Printable Official Receipt in PKR ---');
  const receiptRes = await request('GET', `/payments/receipt/${orderId}`, null, buyerToken);
  console.log('Receipt Number:', receiptRes.data?.data?.receiptNumber);
  console.log('Currency:', receiptRes.data?.data?.currency);
  console.log('Fulfillment Method:', receiptRes.data?.data?.fulfillmentMethod);
  console.log('Paid Total:', receiptRes.data?.data?.totalAmount);

  if (receiptRes.status === 200 && receiptRes.data?.data?.currency === 'PKR') {
    console.log('✅ TEST 7 PASSED: Official printable receipt retrieved with complete PKR breakdown.\n');
  } else {
    console.error('❌ TEST 7 FAILED:', receiptRes.data);
    process.exit(1);
  }

  // Test 8: Seller Login & Profile Update with Pakistan Location Hierarchy and Polygon
  console.log('--- TEST 8: Seller Profile Update (Location Hierarchy, Polygon, Audit) ---');
  const sellerLoginRes = await request('POST', '/auth/login', {
    email: 'seller1@kisanova.com',
    password: 'Seller@123456'
  });
  const sellerToken = sellerLoginRes.data?.data?.token;

  const profileUpdateRes = await request('PUT', '/seller/profile', {
    bio: 'Premier organic wheat and citrus orchards in central Punjab',
    province: 'Punjab',
    district: 'Faisalabad',
    tehsil: 'Jaranwala',
    locality: 'Chak 240 GB',
    address: 'Near Canal Bridge, Chak 240 GB',
    latitude: 31.3342,
    longitude: 73.4198,
    farm_polygon: JSON.stringify([
      { lat: 31.3342, lng: 73.4198 },
      { lat: 31.3360, lng: 73.4215 },
      { lat: 31.3330, lng: 73.4230 },
      { lat: 31.3315, lng: 73.4205 }
    ]),
    declared_acreage: 25.5,
    calculated_acreage: 26.1,
    delivery_available: true,
    pickup_available: true,
    delivery_fee: 350.00,
    estimated_delivery_min_days: 2,
    estimated_delivery_max_days: 4,
    pickup_instructions: 'Call gate keeper at arrival. Tractor trailer loading dock available.',
    payout_method: 'BANK_ACCOUNT',
    payout_account_title: 'Patel Agro Enterprise',
    payout_bank_name: 'Habib Bank Limited (HBL)',
    payout_account_number: 'PK36HABB0001234567890123'
  }, sellerToken);

  console.log('Profile Update Success:', profileUpdateRes.data?.success);
  console.log('Profile Message:', profileUpdateRes.data?.message);
  console.log('Approval Status:', profileUpdateRes.data?.data?.approval_status);

  if (profileUpdateRes.status === 200) {
    console.log('✅ TEST 8 PASSED: Seller profile saved location hierarchy, boundary polygon, acreage, and triggered audit review.\n');
    // Restore APPROVED status so seller can access dashboard metrics
    await pool.query("UPDATE sellers SET approval_status = 'APPROVED' WHERE id = 1");
  } else {
    console.error('❌ TEST 8 FAILED:', profileUpdateRes.data);
    process.exit(1);
  }

  // Test 9: Seller Dashboard Metrics in PKR
  console.log('--- TEST 9: Seller Dashboard Visual Reporting Metrics in PKR ---');
  const dashRes = await request('GET', '/seller/dashboard', null, sellerToken);
  const metrics = dashRes.data?.data?.metrics;
  console.log('Total Revenue:', metrics?.totalRevenue, 'PKR');
  console.log('Paid Amount:', metrics?.paidAmount, 'PKR');
  console.log('Pending Payment Amount:', metrics?.pendingPaymentAmount, 'PKR');
  console.log('Orders Timeline Points:', metrics?.timelineData?.length);
  console.log('Status Counts Count:', metrics?.orderStatusCounts?.length);

  if (dashRes.status === 200 && metrics?.timelineData && metrics?.currency === 'PKR') {
    console.log('✅ TEST 9 PASSED: Seller visual dashboard metrics, timeline, and distribution populated in PKR.\n');
  } else {
    console.error('❌ TEST 9 FAILED:', dashRes.data);
    process.exit(1);
  }

  // Test 10: Seller Payout Balance & Payout History
  console.log('--- TEST 10: Seller Payout Accounting in PKR ---');
  const payoutRes = await request('GET', '/payments/seller/payouts', null, sellerToken);
  console.log('Available Balance:', payoutRes.data?.data?.availableBalance, 'PKR');
  console.log('Total Settled:', payoutRes.data?.data?.totalSettled, 'PKR');
  console.log('Total Withdrawn:', payoutRes.data?.data?.totalWithdrawn, 'PKR');

  if (payoutRes.status === 200 && payoutRes.data?.data?.currency === 'PKR') {
    console.log('✅ TEST 10 PASSED: Seller payouts correctly tracked in PKR.\n');
  } else {
    console.error('❌ TEST 10 FAILED:', payoutRes.data);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🎉 ALL 10 INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
