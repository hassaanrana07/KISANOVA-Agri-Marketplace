const pool = require('./src/config/db');

const API = 'http://localhost:8000/api';

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
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function runVerification() {
  console.log('====================================================');
  console.log('🌱 KISANOVA PRODUCTION READINESS VERIFICATION (V4)');
  console.log('====================================================\n');
  let testsPassed = 0;
  let testsFailed = 0;

  // 1. Health check on port 8000
  try {
    const res = await request(`${API}/health`, { method: 'GET' });
    if (res.ok && res.data?.status === 'ONLINE') {
      console.log('✅ 1. Health Check passed on Port 8000 (Status: ONLINE)');
      testsPassed++;
    } else {
      throw new Error(`Unexpected health response: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    console.error('❌ 1. Health Check failed:', err.message);
    testsFailed++;
  }

  // 2. Multi-Origin CORS Validation (5000, 5140, 5174)
  try {
    const origins = ['http://localhost:5000', 'http://localhost:5140', 'http://localhost:5174'];
    let allCorsOk = true;

    for (const origin of origins) {
      const res = await fetch(`${API}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'GET'
        }
      });
      const allowOrigin = res.headers.get('access-control-allow-origin');
      if (allowOrigin !== origin && allowOrigin !== '*') {
        allCorsOk = false;
        console.error(`  - CORS mismatch for origin ${origin}: got '${allowOrigin}'`);
      }
    }

    if (allCorsOk) {
      console.log('✅ 2. Multi-Origin CORS validated for 5000, 5140, and 5174');
      testsPassed++;
    } else {
      throw new Error('CORS header validation failed for one or more application origins.');
    }
  } catch (err) {
    console.error('❌ 2. CORS validation failed:', err.message);
    testsFailed++;
  }

  // 3. User Logins (Admin, Seller, Buyer)
  let adminToken = '';
  let sellerToken = '';
  let buyerToken = '';
  let sellerId = null;

  try {
    // Admin Login
    const adminRes = await request(`${API}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@kisanova.com', password: 'Admin@123456' }
    });
    if (!adminRes.ok || !adminRes.data?.data?.token) {
      throw new Error('Admin login failed');
    }
    adminToken = adminRes.data.data.token;

    // Seller Login
    const sellerRes = await request(`${API}/auth/login`, {
      method: 'POST',
      body: { email: 'seller1@kisanova.com', password: 'Seller@123456' }
    });
    if (!sellerRes.ok || !sellerRes.data?.data?.token) {
      throw new Error('Seller login failed');
    }
    sellerToken = sellerRes.data.data.token;
    sellerId = sellerRes.data.data.seller?.id;

    // Buyer Login
    const buyerRes = await request(`${API}/auth/login`, {
      method: 'POST',
      body: { email: 'buyer1@kisanova.com', password: 'Buyer@123456' }
    });
    if (!buyerRes.ok || !buyerRes.data?.data?.token) {
      throw new Error('Buyer login failed');
    }
    buyerToken = buyerRes.data.data.token;

    console.log('✅ 3. Authenticated all roles (Admin, Seller, Buyer)');
    testsPassed++;
  } catch (err) {
    console.error('❌ 3. Authentication failed:', err.message);
    testsFailed++;
  }

  // 4. Role Authorization Boundary Enforcement
  try {
    // Buyer attempting to access admin metrics -> must fail with 403
    const buyerToAdmin = await request(`${API}/admin/metrics`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    // Seller attempting to access admin metrics -> must fail with 403
    const sellerToAdmin = await request(`${API}/admin/metrics`, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });

    // Buyer attempting to access seller dashboard -> must fail with 403
    const buyerToSeller = await request(`${API}/seller/dashboard`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    if (buyerToAdmin.status === 403 && sellerToAdmin.status === 403 && buyerToSeller.status === 403) {
      console.log('✅ 4. Role Boundaries Enforced: Unauthorized cross-portal calls rejected (403 Forbidden)');
      testsPassed++;
    } else {
      throw new Error(`Unexpected status codes: BuyerAdmin=${buyerToAdmin.status}, SellerAdmin=${sellerToAdmin.status}, BuyerSeller=${buyerToSeller.status}`);
    }
  } catch (err) {
    console.error('❌ 4. Role Boundary check failed:', err.message);
    testsFailed++;
  }

  // 5. OTP Security Verification: No OTP leakage in API response
  try {
    await pool.query('DELETE FROM password_resets WHERE email = ?', ['seller1@kisanova.com']);

    const otpRes = await request(`${API}/auth/forgot-password`, {
      method: 'POST',
      body: { identifier: 'seller1@kisanova.com', portalRole: 'SELLER' }
    });

    if (!otpRes.ok) {
      throw new Error('Forgot password request returned non-200: ' + JSON.stringify(otpRes.data));
    }

    // CRITICAL: Ensure devOtp is NOT present in the JSON body
    if (otpRes.data?.devOtp !== undefined) {
      throw new Error('CRITICAL SECURITY LEAK: devOtp is present in response JSON!');
    }

    if (JSON.stringify(otpRes.data).match(/"otp":/i)) {
      throw new Error('CRITICAL SECURITY LEAK: Plaintext OTP leaked in response JSON!');
    }

    // Verify OTP was stored in DB with 10-minute expiry
    const [storedOtps] = await pool.query(
      `SELECT * FROM password_resets 
       WHERE email = 'seller1@kisanova.com' AND used = FALSE 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (storedOtps.length === 0) {
      throw new Error('No OTP recorded in database table');
    }

    const latestOtp = storedOtps[0];
    const expiryTime = new Date(latestOtp.expires_at).getTime();
    const createdTime = new Date(latestOtp.created_at).getTime();
    const durationMinutes = Math.round((expiryTime - createdTime) / (60 * 1000));

    if (durationMinutes < 9 || durationMinutes > 11) {
      throw new Error(`Unexpected OTP validity window: ${durationMinutes} minutes (expected ~10m)`);
    }

    console.log(`✅ 5. OTP Security Validated: Zero response leakage, 10m expiry verified (${durationMinutes}m window)`);
    testsPassed++;
  } catch (err) {
    console.error('❌ 5. OTP Security check failed:', err.message);
    testsFailed++;
  }

  // 6. Cash on Delivery (COD) Accounting & Partial Payments
  try {
    // Find an existing seller order
    const [subOrders] = await pool.query(
      'SELECT id, subtotal, delivery_fee, payment_status, amount_paid, amount_remaining FROM seller_orders LIMIT 1'
    );

    if (subOrders.length === 0) {
      console.log('⚠️  6. Skipping COD test (no orders exist in DB)');
    } else {
      const testOrder = subOrders[0];
      const totalValue = parseFloat(testOrder.subtotal) + parseFloat(testOrder.delivery_fee || 0);
      const partialAmount = Math.round(totalValue * 0.4);

      // Update to PARTIALLY_PAID
      const partialRes = await request(`${API}/seller/orders/${testOrder.id}/payment-status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: {
          payment_status: 'PARTIALLY_PAID',
          amount_paid: partialAmount
        }
      });

      if (!partialRes.ok) {
        throw new Error('Failed to update payment status to PARTIALLY_PAID: ' + JSON.stringify(partialRes.data));
      }

      // Fetch the order detail to verify ledger calculations
      const detailRes = await request(`${API}/seller/orders/${testOrder.id}`, {
        headers: { Authorization: `Bearer ${sellerToken}` }
      });

      const updated = detailRes.data?.data;
      if (!updated) {
        throw new Error('Could not fetch updated seller order detail');
      }

      const expectedRemaining = Math.max(0, totalValue - partialAmount);
      const actualPaid = parseFloat(updated.amount_paid);
      const actualRemaining = parseFloat(updated.amount_remaining);

      if (Math.abs(actualPaid - partialAmount) > 0.01 || Math.abs(actualRemaining - expectedRemaining) > 0.01) {
        throw new Error(`Accounting mismatch: Expected Paid=${partialAmount}, Rem=${expectedRemaining}. Got Paid=${actualPaid}, Rem=${actualRemaining}`);
      }

      // Update to PAID (full settlement)
      const fullRes = await request(`${API}/seller/orders/${testOrder.id}/payment-status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: { payment_status: 'PAID' }
      });

      if (!fullRes.ok) {
        throw new Error('Failed to update payment status to PAID');
      }

      const finalDetail = await request(`${API}/seller/orders/${testOrder.id}`, {
        headers: { Authorization: `Bearer ${sellerToken}` }
      });

      const finalOrder = finalDetail.data?.data;
      if (finalOrder.payment_status !== 'PAID' || parseFloat(finalOrder.amount_remaining) !== 0) {
        throw new Error(`Expected PAID with 0 remaining: status=${finalOrder.payment_status}, remaining=${finalOrder.amount_remaining}`);
      }

      console.log(`✅ 6. COD Accounting Ledger Verified: Total=${totalValue}, Partial Paid=${partialAmount} (Remaining=${expectedRemaining}), Full Settle=PAID (0 remaining)`);
      testsPassed++;
    }
  } catch (err) {
    console.error('❌ 6. COD Accounting check failed:', err.message);
    testsFailed++;
  }

  // 7. Admin Dashboard KPIs & Visualization Datasets
  try {
    const metricsRes = await request(`${API}/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (!metricsRes.ok) {
      throw new Error('Failed to load admin metrics: ' + JSON.stringify(metricsRes.data));
    }

    const m = metricsRes.data?.data;
    if (!m?.kpis) {
      throw new Error('Missing kpis object in admin metrics response');
    }

    // Verify 6 KPI fields
    const hasTotalRevenue = m.kpis.totalRevenue !== undefined;
    const hasPaidRevenue = m.kpis.paidRevenue !== undefined;
    const hasPendingRevenue = m.kpis.pendingRevenue !== undefined;
    const hasTotalOrders = m.kpis.totalOrders !== undefined;
    const hasTotalSellers = m.kpis.totalSellers !== undefined;
    const hasTotalBuyers = m.kpis.totalBuyers !== undefined;

    if (!hasTotalRevenue || !hasPaidRevenue || !hasPendingRevenue || !hasTotalOrders || !hasTotalSellers || !hasTotalBuyers) {
      throw new Error('One or more of the 6 core KPIs is missing from response');
    }

    // Verify 4 visualization arrays
    const hasTimeline = Array.isArray(m.ordersTimeline);
    const hasOrderStatus = Array.isArray(m.orderStatusDistribution);
    const hasPaymentStatus = Array.isArray(m.paymentStatusDistribution);
    const hasCategoryDist = Array.isArray(m.categoryDistribution);

    if (!hasTimeline || !hasOrderStatus || !hasPaymentStatus || !hasCategoryDist) {
      throw new Error('One or more of the 4 visualization arrays is missing from response');
    }

    console.log(`✅ 7. Admin Analytics Validated: 6 KPIs populated, 4 Visualization Datasets returned (Timeline=${m.ordersTimeline.length}, OrderStatus=${m.orderStatusDistribution.length}, PaymentStatus=${m.paymentStatusDistribution.length}, Categories=${m.categoryDistribution.length})`);
    testsPassed++;
  } catch (err) {
    console.error('❌ 7. Admin Analytics check failed:', err.message);
    testsFailed++;
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('====================================================');

  process.exit(testsFailed === 0 ? 0 : 1);
}

runVerification();
