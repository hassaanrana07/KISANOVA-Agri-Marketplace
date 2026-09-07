/**
 * ============================================================================
 * RATE LIMITING & EXPONENTIAL BACKOFF TEST SUITE (test_rate_limiting.js)
 * ============================================================================
 * 
 * Verifies:
 * 1. Public endpoint moderate limits & standard RFC rate limit headers
 * 2. Authenticated user looser limits isolated by user ID
 * 3. Auth routes per-IP rate limiting
 * 4. Auth routes per-account exponential backoff (no hard lockout)
 * 5. Distributed attack defense (rotating IPs against same account blocked)
 * 6. Successful authentication resets failure streak and backoff timer
 * 7. Environment variable configurability
 */

// Enable rate limiting in test mode for this test suite
process.env.FORCE_RATE_LIMIT = 'true';
process.env.RATE_LIMIT_ENABLED = 'true';

const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const {
  publicLimiter,
  authenticatedLimiter,
  createRateLimiter,
  createAuthBackoffLimiter
} = require('./src/middleware/rateLimiter');
const config = require('./src/config/rateLimitConfig');

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
    if (body) {
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
  console.log('🧪 RUNNING KISANOVA RATE LIMITER & BACKOFF TEST SUITE');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Public Limiter & Rate Limit Headers
  // --------------------------------------------------------------------------
  console.log('Test 1: Public Limiter (Moderate Tier) & Standard Headers');
  {
    const app = express();
    app.set('trust proxy', 1);

    // Custom test limiter: 3 requests per 5 seconds
    const testPublicLimiter = createRateLimiter({
      windowMs: 5000,
      max: 3,
      message: 'Too many public requests'
    });

    app.get('/api/test-public', testPublicLimiter, (req, res) => {
      res.json({ success: true, message: 'Public content' });
    });

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));

    try {
      // 1st request -> Allowed
      const res1 = await makeRequest(server, { path: '/api/test-public' });
      assert(res1.statusCode === 200, '1st request within limit succeeds with 200');
      assert(res1.headers['x-ratelimit-limit'] === '3', 'X-RateLimit-Limit header is present');
      assert(res1.headers['x-ratelimit-remaining'] === '2', 'X-RateLimit-Remaining correctly decremented to 2');

      // 2nd request -> Allowed
      const res2 = await makeRequest(server, { path: '/api/test-public' });
      assert(res2.statusCode === 200, '2nd request succeeds');
      assert(res2.headers['x-ratelimit-remaining'] === '1', 'Remaining decremented to 1');

      // 3rd request -> Allowed
      const res3 = await makeRequest(server, { path: '/api/test-public' });
      assert(res3.statusCode === 200, '3rd request succeeds at max limit');
      assert(res3.headers['x-ratelimit-remaining'] === '0', 'Remaining decremented to 0');

      // 4th request -> 429 Too Many Requests
      const res4 = await makeRequest(server, { path: '/api/test-public' });
      assert(res4.statusCode === 429, '4th request exceeds threshold and returns 429');
      assert(res4.headers['retry-after'] !== undefined, 'Retry-After header is returned');
      assert(res4.body.success === false, 'Response body indicates failure');
    } finally {
      server.close();
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2: Authenticated User Limiter (User-Keyed Isolation)
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Authenticated Limiter (Looser Tier & User ID Isolation)');
  {
    const app = express();
    app.set('trust proxy', 1);

    const testAuthLimiter = createRateLimiter({
      windowMs: 5000,
      max: 2, // 2 per user
      keyGenerator: (req) => req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`
    });

    // Mock auth middleware
    app.use('/api/user-action', (req, res, next) => {
      const auth = req.headers['authorization'];
      if (auth === 'Bearer user-1-token') {
        req.user = { id: 'user-uuid-1', role: 'BUYER' };
      } else if (auth === 'Bearer user-2-token') {
        req.user = { id: 'user-uuid-2', role: 'SELLER' };
      }
      next();
    });

    app.get('/api/user-action', testAuthLimiter, (req, res) => {
      res.json({ success: true, userId: req.user?.id });
    });

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));

    try {
      // User 1 makes 2 requests from same IP (127.0.0.1)
      const u1_r1 = await makeRequest(server, { path: '/api/user-action', headers: { authorization: 'Bearer user-1-token' } });
      assert(u1_r1.statusCode === 200, 'User 1 1st request succeeds');
      const u1_r2 = await makeRequest(server, { path: '/api/user-action', headers: { authorization: 'Bearer user-1-token' } });
      assert(u1_r2.statusCode === 200, 'User 1 2nd request succeeds');

      // User 1 3rd request is blocked
      const u1_r3 = await makeRequest(server, { path: '/api/user-action', headers: { authorization: 'Bearer user-1-token' } });
      assert(u1_r3.statusCode === 429, 'User 1 3rd request is throttled (429)');

      // User 2 from SAME IP is NOT blocked because limits are per-user ID!
      const u2_r1 = await makeRequest(server, { path: '/api/user-action', headers: { authorization: 'Bearer user-2-token' } });
      assert(u2_r1.statusCode === 200, 'User 2 from same IP succeeds (independent user bucket)');
    } finally {
      server.close();
    }
  }

  // --------------------------------------------------------------------------
  // TEST 3: Auth Routes — Per-IP Throttling
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Auth Routes — Per-IP Rate Limiting');
  {
    const app = express();
    app.use(express.json());
    app.set('trust proxy', 1);

    const testAuthRouteLimiter = createAuthBackoffLimiter({
      ipWindowMs: 5000,
      ipMax: 3,
      accountWindowMs: 5000,
      accountMaxAttempts: 10, // high account threshold so IP limit hits first
      backoffBaseMs: 1000
    });

    app.post('/api/auth/test-login', testAuthRouteLimiter, (req, res) => {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    });

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));

    try {
      const ipHeaders = { 'x-forwarded-for': '192.168.1.50' };
      // 3 attempts from 192.168.1.50
      await makeRequest(server, { method: 'POST', path: '/api/auth/test-login', headers: ipHeaders }, { email: 'user1@test.com' });
      await makeRequest(server, { method: 'POST', path: '/api/auth/test-login', headers: ipHeaders }, { email: 'user2@test.com' });
      await makeRequest(server, { method: 'POST', path: '/api/auth/test-login', headers: ipHeaders }, { email: 'user3@test.com' });

      // 4th attempt from same IP should be blocked by IP limit
      const res4 = await makeRequest(server, { method: 'POST', path: '/api/auth/test-login', headers: ipHeaders }, { email: 'user4@test.com' });
      assert(res4.statusCode === 429, 'Per-IP limit blocks 4th request from same IP (429)');
      assert(res4.body.scope === 'ip', '429 response scope identifies IP limit');
    } finally {
      server.close();
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4: Auth Routes — Per-Account Exponential Backoff (No Hard Lockout)
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Auth Routes — Per-Account Exponential Backoff');
  {
    const app = express();
    app.use(express.json());
    app.set('trust proxy', 1);

    // Account threshold: 3 failed attempts, base backoff: 500ms, factor: 2x
    const testBackoffLimiter = createAuthBackoffLimiter({
      ipWindowMs: 60000,
      ipMax: 50,
      accountWindowMs: 60000,
      accountMaxAttempts: 3,
      backoffBaseMs: 500, // 500ms base
      backoffFactor: 2,   // 500ms, 1000ms, 2000ms...
      backoffMaxMs: 10000
    });

    let mockPasswordCorrect = false;

    app.post('/api/auth/login', testBackoffLimiter, (req, res) => {
      if (mockPasswordCorrect) {
        return res.status(200).json({ success: true, token: 'mock-jwt' });
      }
      return res.status(401).json({ success: false, message: 'Invalid password' });
    });

    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));

    try {
      const targetEmail = 'farmer.ali@kisanova.pk';

      // 3 failed attempts (attempts 1, 2, 3)
      for (let i = 1; i <= 3; i++) {
        const res = await makeRequest(
          server,
          { method: 'POST', path: '/api/auth/login' },
          { email: targetEmail, password: 'wrong' }
        );
        assert(res.statusCode === 401, `Failed attempt ${i} returns 401 without backoff rejection`);
      }

      // 4th attempt immediately -> Should be blocked by exponential backoff (delay = 500ms * 2^0 = 500ms)
      const blockedRes1 = await makeRequest(
        server,
        { method: 'POST', path: '/api/auth/login' },
        { email: targetEmail, password: 'wrong' }
      );
      assert(blockedRes1.statusCode === 429, 'Attempt during backoff window receives 429 Too Many Requests');
      assert(blockedRes1.body.backoff === true, 'Response body indicates backoff is active');
      assert(blockedRes1.body.scope === 'account', 'Response scope identifies account');
      assert(blockedRes1.headers['retry-after'] !== undefined, 'Retry-After header returned');

      // Wait 600ms for backoff to expire
      await new Promise(r => setTimeout(r, 600));

      // 5th attempt after backoff expired -> Is allowed to reach auth logic, fails again
      const retryRes = await makeRequest(
        server,
        { method: 'POST', path: '/api/auth/login' },
        { email: targetEmail, password: 'wrong' }
      );
      assert(retryRes.statusCode === 401, 'Attempt after backoff expiration reaches auth logic (401)');

      // Next backoff delay should be doubled (500ms * 2^1 = 1000ms)
      const blockedRes2 = await makeRequest(
        server,
        { method: 'POST', path: '/api/auth/login' },
        { email: targetEmail, password: 'wrong' }
      );
      assert(blockedRes2.statusCode === 429, 'Immediate attempt rejected by doubled backoff');

      // ------------------------------------------------------------------------
      // TEST 5: Defense Against Distributed Attacks (Rotating IPs)
      // --------------------------------------------------------------------------
      console.log('\nTest 5: Defense Against Distributed Attacks (Rotating IPs targeting same account)');
      const rotatingIpRes = await makeRequest(
        server,
        {
          method: 'POST',
          path: '/api/auth/login',
          headers: { 'x-forwarded-for': '203.0.113.' + Math.floor(Math.random() * 200 + 1) }
        },
        { email: targetEmail, password: 'wrong' }
      );
      assert(rotatingIpRes.statusCode === 429, 'Attack from different IP against backed-off account is STILL blocked');

      // ------------------------------------------------------------------------
      // TEST 6: Successful Auth Clears Consecutive Failures & Backoff
      // --------------------------------------------------------------------------
      console.log('\nTest 6: Successful Login Resets Consecutive Failure Streak');
      // Wait for backoff to expire (1100ms)
      await new Promise(r => setTimeout(r, 1100));

      // User enters CORRECT password
      mockPasswordCorrect = true;
      const successRes = await makeRequest(
        server,
        { method: 'POST', path: '/api/auth/login' },
        { email: targetEmail, password: 'correct_password' }
      );
      assert(successRes.statusCode === 200, 'Successful login succeeds with 200');

      // Now user makes an invalid attempt: should be back at failure count 1 (NOT blocked by backoff!)
      mockPasswordCorrect = false;
      const postSuccessFail = await makeRequest(
        server,
        { method: 'POST', path: '/api/auth/login' },
        { email: targetEmail, password: 'wrong' }
      );
      assert(postSuccessFail.statusCode === 401, 'Post-success failure is allowed immediately (failure streak was cleared!)');

    } finally {
      server.close();
    }
  }

  // --------------------------------------------------------------------------
  // TEST 7: Configuration Overrides & Dynamic Reading
  // --------------------------------------------------------------------------
  console.log('\nTest 7: Dynamic Configuration Overrides via Environment Variables');
  {
    process.env.RATE_LIMIT_PUBLIC_MAX = '777';
    process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_MS = '3333';
    process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX_ATTEMPTS = '7';

    assert(config.public.max === 777, 'Public max dynamically reflects RATE_LIMIT_PUBLIC_MAX=777');
    assert(config.auth.backoffBaseMs === 3333, 'Backoff base dynamically reflects RATE_LIMIT_AUTH_BACKOFF_BASE_MS=3333');
    assert(config.auth.accountMaxAttempts === 7, 'Account max attempts dynamically reflects RATE_LIMIT_AUTH_ACCOUNT_MAX_ATTEMPTS=7');

    // Clean up env overrides
    delete process.env.RATE_LIMIT_PUBLIC_MAX;
    delete process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_MS;
    delete process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX_ATTEMPTS;

    assert(config.public.max === 300, 'Public max falls back to default 300');
    assert(config.auth.backoffBaseMs === 2000, 'Backoff base falls back to default 2000');
    assert(config.auth.accountMaxAttempts === 5, 'Account max attempts falls back to default 5');
  }

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
