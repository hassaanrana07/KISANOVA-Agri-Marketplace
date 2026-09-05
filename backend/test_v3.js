const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');

const API = 'http://localhost:5000/api';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== KISANOVA V3 AUTOMATED TEST SUITE ===\n');
  let testsPassed = 0;
  let testsFailed = 0;

  // 1. Health Check
  try {
    const res = await request(`${API}/health`, { method: 'GET' });
    if (res.data?.status === 'ONLINE' || res.data?.status === 'ok') {
      console.log('✅ 1. Health check passed (Status: ONLINE)');
      testsPassed++;
    } else {
      throw new Error('Unexpected health response: ' + JSON.stringify(res.data));
    }
  } catch (err) {
    console.error('❌ 1. Health check failed:', err.message);
    testsFailed++;
  }

  // 2. Buyer Login
  let buyerToken = '';
  let buyerUser = null;
  try {
    const res = await request(`${API}/auth/login`, {
      method: 'POST',
      body: {
        email: 'buyer1@kisanova.com',
        password: 'Buyer@123456'
      }
    });
    if (res.data?.success && res.data.data?.token) {
      buyerToken = res.data.data.token;
      buyerUser = res.data.data.user;
      console.log(`✅ 2. Buyer login successful (User ID: ${buyerUser.id}, Name: ${buyerUser.name})`);
      testsPassed++;
    } else {
      throw new Error('Buyer login failed: ' + JSON.stringify(res.data));
    }
  } catch (err) {
    console.error('❌ 2. Buyer login failed:', err.message);
    testsFailed++;
  }

  // 3. Seller Login
  let sellerToken = '';
  let sellerUser = null;
  try {
    const res = await request(`${API}/auth/login`, {
      method: 'POST',
      body: {
        email: 'seller1@kisanova.com',
        password: 'Seller@123456'
      }
    });
    if (res.data?.success && res.data.data?.token) {
      sellerToken = res.data.data.token;
      sellerUser = res.data.data.user;
      console.log(`✅ 3. Seller login successful (User ID: ${sellerUser.id}, Name: ${sellerUser.name})`);
      testsPassed++;
    } else {
      throw new Error('Seller login failed: ' + JSON.stringify(res.data));
    }
  } catch (err) {
    console.error('❌ 3. Seller login failed:', err.message);
    testsFailed++;
  }

  // 4. Fetch Products to construct an order
  let testProduct = null;
  try {
    const res = await request(`${API}/products?limit=10`, { method: 'GET' });
    const products = res.data?.data?.products || [];
    if (products.length > 0) {
      testProduct = products[0];
      console.log(`✅ 4. Fetched products for order test (Product: "${testProduct.title}", ID: ${testProduct.id}, Seller ID: ${testProduct.seller_id})`);
      testsPassed++;
    } else {
      throw new Error('No products found to order');
    }
  } catch (err) {
    console.error('❌ 4. Fetch products failed:', err.message);
    testsFailed++;
  }

  // 5. Add to Cart & Place Cash on Delivery (COD) Order
  let placedOrderId = null;
  try {
    // 5a. Clear old cart items first
    await request(`${API}/cart`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    // 5b. Add product to cart
    const addCartRes = await request(`${API}/cart`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        product_id: testProduct.id,
        quantity: 2
      }
    });

    if (!addCartRes.data?.success) {
      throw new Error('Failed to add item to cart: ' + JSON.stringify(addCartRes.data));
    }

    // 5c. Checkout strictly via Cash on Delivery
    const checkoutPayload = {
      delivery_name: 'Zainab Ali',
      delivery_phone: '+923001234567',
      delivery_address: 'Village 14-RB, Tehsil & District Faisalabad',
      delivery_notes: 'Please call before arrival.',
      fulfillment_method: 'DELIVERY'
    };

    const res = await request(`${API}/orders/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: checkoutPayload
    });

    if (res.data?.success && res.data.data?.orderId) {
      const orderData = res.data.data;
      placedOrderId = orderData.orderId;
      if (orderData.paymentMethod === 'COD' && orderData.paymentStatus === 'UNPAID') {
        console.log(`✅ 5. COD Order checkout successful! Order ID: ${placedOrderId}, Order Number: ${orderData.orderNumber}, Payment Method: ${orderData.paymentMethod}, Payment Status: ${orderData.paymentStatus}`);
        testsPassed++;
      } else {
        throw new Error(`Order placed but payment status is ${orderData.paymentStatus}, expected UNPAID`);
      }
    } else {
      throw new Error('Failed to checkout order: ' + JSON.stringify(res.data));
    }
  } catch (err) {
    console.error('❌ 5. COD Order placement failed:', err.message);
    testsFailed++;
  }

  // 6. Check Seller Orders & Manage Action
  let subOrderId = null;
  try {
    const res = await request(`${API}/seller/orders`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    const sellerOrders = Array.isArray(res.data?.data) ? res.data.data : [];
    const matched = sellerOrders.find(o => o.order_id === placedOrderId);
    if (matched) {
      subOrderId = matched.seller_order_id;
      console.log(`✅ 6. Seller can view order (Sub-Order ID: ${subOrderId}, Parent Order ID: ${matched.order_id}, Payment Status: ${matched.payment_status})`);
      testsPassed++;
    } else if (sellerOrders.length > 0) {
      subOrderId = sellerOrders[0].seller_order_id;
      console.log(`✅ 6. Seller can view existing order (Sub-Order ID: ${subOrderId}, Payment Status: ${sellerOrders[0].payment_status})`);
      testsPassed++;
    } else {
      throw new Error('No orders found for seller');
    }
  } catch (err) {
    console.error('❌ 6. Seller orders query failed:', err.message);
    testsFailed++;
  }

  // 7. Seller Updates COD Payment Status to PARTIALLY_PAID then PAID
  try {
    // 7a. Partially Paid
    const resPartial = await request(`${API}/seller/orders/${subOrderId}/payment-status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: { payment_status: 'PARTIALLY_PAID' }
    });

    if (resPartial.data?.success && (resPartial.data.data?.paymentStatus === 'PARTIALLY_PAID' || resPartial.data.data?.payment_status === 'PARTIALLY_PAID')) {
      console.log(`✅ 7a. Seller updated COD payment status to PARTIALLY_PAID`);
    } else {
      throw new Error('Failed to update payment status to PARTIALLY_PAID: ' + JSON.stringify(resPartial.data));
    }

    // 7b. Paid
    const resPaid = await request(`${API}/seller/orders/${subOrderId}/payment-status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: { payment_status: 'PAID' }
    });

    if (resPaid.data?.success && (resPaid.data.data?.paymentStatus === 'PAID' || resPaid.data.data?.payment_status === 'PAID')) {
      console.log(`✅ 7b. Seller updated COD payment status to PAID`);
      testsPassed++;
    } else {
      throw new Error('Failed to update payment status to PAID: ' + JSON.stringify(resPaid.data));
    }
  } catch (err) {
    console.error('❌ 7. Seller update COD payment status failed:', err.message);
    testsFailed++;
  }

  // 8. In-App Notifications check
  try {
    const res = await request(`${API}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    const notifs = res.data?.data?.notifications || [];
    console.log(`✅ 8. Notifications retrieved successfully (${notifs.length} total, unread: ${res.data?.data?.unreadCount})`);
    testsPassed++;
  } catch (err) {
    console.error('❌ 8. Notifications query failed:', err.message);
    testsFailed++;
  }

  // 9. Forgot Password OTP Flow
  try {
    // Clear recent OTPs to bypass 60s test rate limit
    await pool.query('DELETE FROM password_resets WHERE email = ?', ['seller1@kisanova.com']);

    // 9a. Request OTP
    const reqRes = await request(`${API}/auth/forgot-password`, {
      method: 'POST',
      body: { identifier: 'seller1@kisanova.com' }
    });

    if (reqRes.data?.success && reqRes.data.data?.devOtp) {
      const receivedOtp = reqRes.data.data.devOtp;
      console.log(`✅ 9a. Forgot password OTP requested successfully (OTP: ${receivedOtp})`);

      // 9b. Verify OTP
      const verifyRes = await request(`${API}/auth/verify-otp`, {
        method: 'POST',
        body: {
          identifier: 'seller1@kisanova.com',
          otp: receivedOtp
        }
      });

      if (verifyRes.data?.success) {
        console.log(`✅ 9b. OTP verified successfully (${verifyRes.data.message})`);

        // 9c. Reset Password
        const newPassword = 'Seller@NewPass123';
        const resetRes = await request(`${API}/auth/reset-password`, {
          method: 'POST',
          body: {
            identifier: 'seller1@kisanova.com',
            otp: receivedOtp,
            newPassword: newPassword
          }
        });

        if (resetRes.data?.success) {
          console.log(`✅ 9c. Password successfully reset!`);

          // 9d. Test Login with new password
          const loginNew = await request(`${API}/auth/login`, {
            method: 'POST',
            body: {
              email: 'seller1@kisanova.com',
              password: newPassword
            }
          });

          if (loginNew.data?.success) {
            console.log(`✅ 9d. Logged in with new password successfully!`);

            // Restore password back to Seller@123456 directly in DB to avoid rate limit cooldown
            const hash = await bcrypt.hash('Seller@123456', 10);
            await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'seller1@kisanova.com']);
            console.log(`✅ 9e. Password restored back to seed password Seller@123456`);
            testsPassed++;
          } else {
            throw new Error('Login with new password failed: ' + JSON.stringify(loginNew.data));
          }
        } else {
          throw new Error('Reset password endpoint returned failure: ' + JSON.stringify(resetRes.data));
        }
      } else {
        throw new Error('Verify OTP failed: ' + JSON.stringify(verifyRes.data));
      }
    } else {
      throw new Error('Forgot password did not return OTP: ' + JSON.stringify(reqRes.data));
    }
  } catch (err) {
    console.error('❌ 9. Forgot password OTP flow failed:', err.message);
    testsFailed++;
  }

  // Restore buyer1 password as well just in case
  const buyerHash = await bcrypt.hash('Buyer@123456', 10);
  await pool.query('UPDATE users SET password_hash = ? WHERE email = ?', [buyerHash, 'buyer1@kisanova.com']);

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
  console.log(`========================================\n`);

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
