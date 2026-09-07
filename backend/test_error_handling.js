/**
 * test_error_handling.js
 * Comprehensive automated test suite for error handling & information leakage prevention.
 * Validates:
 * 1. Zero stack traces in client responses across any environment (development & production).
 * 2. Complete masking of raw database errors (ER_*, SQL queries, table/column names).
 * 3. User-friendly normalization of Multer file upload errors.
 * 4. User-friendly normalization of malformed JSON payload errors.
 * 5. Server-side diagnostic logging preserving full stack traces, SQL, and correlation errorId.
 * 6. Clean 404 catch-all JSON responses without internal traces.
 * 7. Absence of raw error properties in controller response bodies.
 */

const http = require('http');
const express = require('express');
const { errorHandler, containsSensitiveDetails } = require('./src/middleware/errorHandler');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

// Intercept console.error to verify server-side logging without polluting terminal
let lastServerErrorLogged = null;
const originalConsoleError = console.error;
const captureServerLogs = (fn) => {
  const logged = [];
  console.error = (...args) => {
    logged.push(args);
  };
  try {
    fn(logged);
  } finally {
    console.error = originalConsoleError;
  }
  return logged;
};

// Helper to make test HTTP requests using native http module
const makeRequest = (app, options) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const reqOpts = {
        hostname: '127.0.0.1',
        port,
        path: options.path || '/',
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(reqOpts, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          server.close(() => {
            let json = null;
            try { json = JSON.parse(body); } catch (e) {}
            resolve({ statusCode: res.statusCode, headers: res.headers, rawBody: body, body: json });
          });
        });
      });

      req.on('error', (err) => {
        server.close(() => reject(err));
      });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  });
};

(async () => {
  console.log('============================================================');
  console.log('🛡️  RUNNING KISANOVA ERROR HANDLING & LEAK PROTECTION SUITE');
  console.log('============================================================\n');

  // =========================================================================
  // TEST SUITE 1: Stack Trace Suppression & Sensitive Details Filter
  // =========================================================================
  console.log('Test Suite 1: Stack Trace & Sensitive Path Masking');

  assert(
    containsSensitiveDetails('Error at C:\\Users\\Usama\\server.js:42:15') === true,
    'Sensitive filter detects Windows absolute file paths'
  );
  assert(
    containsSensitiveDetails('Error at /Users/developer/app/server.js:10:5') === true,
    'Sensitive filter detects Unix absolute file paths'
  );
  assert(
    containsSensitiveDetails("Table 'kisanova_db.users' doesn't exist") === true,
    'Sensitive filter detects MySQL table errors'
  );
  assert(
    containsSensitiveDetails('SELECT * FROM users WHERE id = 1') === true,
    'Sensitive filter detects raw SQL queries'
  );
  assert(
    containsSensitiveDetails('ER_NO_SUCH_TABLE: table not found') === true,
    'Sensitive filter detects MySQL error codes (ER_*)'
  );
  assert(
    containsSensitiveDetails('Product not found.') === false,
    'Sensitive filter allows clean, safe business messages'
  );

  // =========================================================================
  // TEST SUITE 2: Global Error Handler - Zero Stack Leak in Development & Production
  // =========================================================================
  console.log('\nTest Suite 2: Global Error Handler 500 Responses (Zero Stack Trace)');

  for (const env of ['development', 'production', 'test']) {
    process.env.NODE_ENV = env;

    const testApp = express();
    testApp.get('/throw-error', (req, res, next) => {
      const err = new Error('Unexpected catastrophic crash in module xyz');
      err.stack = `Error: Unexpected catastrophic crash\n    at Object.<anonymous> (C:\\secret\\path\\server.js:100:15)`;
      next(err);
    });
    testApp.use(errorHandler);

    let loggedLogs = [];
    console.error = (...args) => { loggedLogs.push(args); };

    const res = await makeRequest(testApp, { path: '/throw-error' });
    console.error = originalConsoleError;

    assert(res.statusCode === 500, `Returns HTTP 500 in NODE_ENV=${env}`);
    assert(res.body.success === false, `Response success is false in ${env}`);
    assert(res.body.message === 'Internal server error occurred.', `Client receives generic message in ${env}`);
    assert(!res.body.stack, `Zero stack trace in response under ${env}`);
    assert(!res.rawBody.includes('C:\\secret\\path'), `Zero filesystem paths in raw response under ${env}`);
    assert(typeof res.body.errorId === 'string' && res.body.errorId.length > 0, `Correlation errorId is provided in ${env}`);

    // Verify server-side logged full stack
    const serverLog = loggedLogs.find((entry) => entry[0] && entry[0].includes('[Server Error'));
    assert(Boolean(serverLog), `Full error details logged server-side for debugging in ${env}`);
    const logData = serverLog ? serverLog[1] : {};
    assert(logData.errorId === res.body.errorId, `Server log errorId matches client response errorId in ${env}`);
    assert(logData.stack && logData.stack.includes('C:\\secret\\path'), `Server log preserves full stack trace for ${env}`);
  }

  // Restore NODE_ENV
  process.env.NODE_ENV = 'test';

  // =========================================================================
  // TEST SUITE 3: Raw MySQL Database Error Masking
  // =========================================================================
  console.log('\nTest Suite 3: Raw MySQL Database Error Masking');

  const dbTestApp = express();
  dbTestApp.get('/simulated-db-error', (req, res, next) => {
    const dbErr = new Error("Table 'kisanova_db.secret_admin_users' doesn't exist");
    dbErr.code = 'ER_NO_SUCH_TABLE';
    dbErr.errno = 1146;
    dbErr.sqlState = '42S02';
    dbErr.sqlMessage = "Table 'kisanova_db.secret_admin_users' doesn't exist";
    dbErr.sql = "SELECT password_hash, auth_token FROM secret_admin_users WHERE email = 'admin@kisanova.com'";
    dbErr.stack = "Error: ER_NO_SUCH_TABLE\n    at Pool.query (E:\\Kisanova\\backend\\src\\config\\db.js:35:10)";
    next(dbErr);
  });
  dbTestApp.use(errorHandler);

  let dbLogs = [];
  console.error = (...args) => { dbLogs.push(args); };
  const dbRes = await makeRequest(dbTestApp, { path: '/simulated-db-error' });
  console.error = originalConsoleError;

  assert(dbRes.statusCode === 500, 'Database error returns HTTP 500');
  assert(dbRes.body.message === 'Internal server error occurred.', 'Database error masked with generic message');
  assert(!dbRes.rawBody.includes('secret_admin_users'), 'Table name is NEVER leaked in client response');
  assert(!dbRes.rawBody.includes('ER_NO_SUCH_TABLE'), 'MySQL error code is NEVER leaked in client response');
  assert(!dbRes.rawBody.includes('password_hash'), 'SQL query columns are NEVER leaked in client response');
  assert(!dbRes.rawBody.includes('backend\\src\\config\\db.js'), 'Database file paths are NEVER leaked in client response');

  // Verify server-side diagnostics
  const dbServerLog = dbLogs.find((entry) => entry[0] && entry[0].includes('[Server Error'));
  assert(Boolean(dbServerLog), 'Server-side logger captures database error event');
  const dbLogData = dbServerLog ? dbServerLog[1] : {};
  assert(dbLogData.code === 'ER_NO_SUCH_TABLE', 'Server-side log includes MySQL code for debugging');
  assert(dbLogData.sql && dbLogData.sql.includes('secret_admin_users'), 'Server-side log includes SQL query for debugging');

  // =========================================================================
  // TEST SUITE 4: Multer Upload & JSON Syntax Errors Normalization
  // =========================================================================
  console.log('\nTest Suite 4: Multer Upload & JSON Syntax Errors Normalization');

  const uploadTestApp = express();
  uploadTestApp.get('/multer-size-error', (req, res, next) => {
    const multerErr = new Error('File too large');
    multerErr.name = 'MulterError';
    multerErr.code = 'LIMIT_FILE_SIZE';
    multerErr.field = 'avatar';
    multerErr.stack = 'MulterError: File too large\n    at PartStream.onData (E:\\Kisanova\\node_modules\\multer\\index.js:40)';
    next(multerErr);
  });
  uploadTestApp.get('/multer-field-error', (req, res, next) => {
    const multerErr = new Error('Unexpected field');
    multerErr.name = 'MulterError';
    multerErr.code = 'LIMIT_UNEXPECTED_FILE';
    multerErr.field = 'hack_payload';
    next(multerErr);
  });
  uploadTestApp.use(errorHandler);

  const sizeRes = await makeRequest(uploadTestApp, { path: '/multer-size-error' });
  assert(sizeRes.statusCode === 400, 'Multer file size limit returns HTTP 400 Bad Request');
  assert(sizeRes.body.message === 'File size exceeds allowable limit (25MB).', 'Clean user-friendly size limit message');
  assert(!sizeRes.rawBody.includes('node_modules'), 'Zero node_modules or path leaks in Multer response');

  const fieldRes = await makeRequest(uploadTestApp, { path: '/multer-field-error' });
  assert(fieldRes.statusCode === 400, 'Multer unexpected file field returns HTTP 400');
  assert(fieldRes.body.message === 'Unexpected file field in upload request.', 'Clean unexpected file message');

  // Test Malformed JSON payload parsing
  const jsonTestApp = express();
  jsonTestApp.use(express.json());
  jsonTestApp.post('/json-test', (req, res) => { res.json({ success: true }); });
  jsonTestApp.use(errorHandler);

  const malformedJsonRes = await makeRequest(jsonTestApp, {
    path: '/json-test',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"invalid": json_without_quotes'
  });
  assert(malformedJsonRes.statusCode === 400, 'Malformed JSON returns HTTP 400 Bad Request');
  assert(
    malformedJsonRes.body.message === 'Malformed JSON payload in request body.',
    'Malformed JSON returns clean generic message without parser stack trace'
  );
  assert(!malformedJsonRes.rawBody.includes('SyntaxError: Unexpected token'), 'Raw parser exception not leaked to client');

  // =========================================================================
  // TEST SUITE 5: Full Application Integration & 404 Catch-All
  // =========================================================================
  console.log('\nTest Suite 5: Full App Integration & 404 Catch-All');

  const app = require('./src/app');

  const api404 = await makeRequest(app, { path: '/api/non-existent-route-xyz' });
  assert(api404.statusCode === 404, 'Unknown API route returns 404');
  assert(api404.body.success === false, 'Unknown API route success is false');
  assert(!api404.rawBody.includes('Cannot GET'), 'Express default HTML error is NOT returned');

  const nonApi404 = await makeRequest(app, { path: '/unmapped-endpoint' });
  assert(nonApi404.statusCode === 404, 'Catch-all route returns 404');
  assert(nonApi404.body.success === false, 'Catch-all route returns JSON format');

  // =========================================================================
  // TEST SUITE 6: Controller Source Code Sanitization Audit
  // =========================================================================
  console.log('\nTest Suite 6: Controller Source Code Sanitization Verification');

  const fs = require('fs');
  const path = require('path');

  const authCode = fs.readFileSync(path.resolve(__dirname, 'src/controllers/authController.js'), 'utf8');
  assert(!authCode.includes('error: error.message'), 'authController does not leak error: error.message');

  const sellerCode = fs.readFileSync(path.resolve(__dirname, 'src/controllers/sellerController.js'), 'utf8');
  assert(!sellerCode.includes('error: error.message'), 'sellerController does not leak error: error.message');
  assert(!sellerCode.includes('Media upload failed: \' + error.message'), 'sellerController uploadMedia does not concatenate raw error');

  const paymentCode = fs.readFileSync(path.resolve(__dirname, 'src/controllers/paymentController.js'), 'utf8');
  assert(!paymentCode.includes('message: error.message ||'), 'paymentController does not pass raw error.message through');

  // Summary
  console.log('\n============================================================');
  console.log(`AUDIT RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All error handling & leak prevention tests passed successfully!\n');
    process.exit(0);
  }
})();
