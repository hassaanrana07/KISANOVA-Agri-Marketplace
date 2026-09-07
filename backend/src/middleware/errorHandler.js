/**
 * errorHandler.js
 * Centralized Application Error & Information Leakage Prevention Middleware.
 *
 * Guarantees:
 * 1. Users NEVER receive stack traces, internal filesystem paths, or raw database errors.
 * 2. Database errors and 5xx exceptions return clean generic messages with correlation IDs.
 * 3. Multer upload errors and malformed JSON payloads return clear HTTP 400 responses.
 * 4. Full error details (stack, SQL query, request context, correlation ID) are logged server-side for debugging.
 */

const crypto = require('crypto');

// Patterns identifying internal file paths, module internals, or raw database messages
const SENSITIVE_PATTERNS = [
  /[A-Za-z]:\\[^ "']+/i,                   // Windows absolute paths (e.g., C:\Users\...)
  /\/(?:Users|home|var|etc|usr|tmp|app)\/[^ "']+/i, // Unix absolute paths
  /node_modules/i,                          // Node module paths
  /\.js:\d+:\d+/i,                          // Script line and column references
  /\bER_[A-Z0-9_]+\b/i,                     // MySQL error codes (e.g., ER_NO_SUCH_TABLE)
  /\bSQLSTATE\[\w+\]/i,                     // SQL state strings
  /Table '[^']+' doesn't exist/i,           // Table existence errors
  /Unknown column '[^']+'/i,                // Column errors
  /Duplicate entry '[^']+'/i,               // Raw unique constraint dumps
  /foreign key constraint fails/i,          // Foreign key dumps
  /\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b.*?\bFROM\b/i // SQL queries
];

/**
 * Checks if a string contains internal system details or sensitive patterns.
 */
const containsSensitiveDetails = (str) => {
  if (typeof str !== 'string') return false;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(str));
};

/**
 * Global Express Error-Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Generate a unique correlation ID for tracking in server logs
  const errorId = crypto.randomUUID();

  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  let clientMessage = 'Internal server error occurred.';

  // Check if error is a MySQL / database error
  const isDatabaseError = Boolean(
    err.code?.startsWith('ER_') ||
    err.sqlState ||
    err.sqlMessage ||
    err.sql ||
    err.errno
  );

  // Check if error is a Multer file upload error
  const isMulterError = err.name === 'MulterError';

  // Check if error is a JSON parse SyntaxError from body-parser
  const isJsonSyntaxError = err instanceof SyntaxError && err.status === 400 && 'body' in err;

  // 1. Handle JSON Syntax Errors
  if (isJsonSyntaxError) {
    statusCode = 400;
    clientMessage = 'Malformed JSON payload in request body.';
  }
  // 2. Handle Multer File Upload Errors
  else if (isMulterError) {
    statusCode = 400;
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        clientMessage = 'File size exceeds allowable limit (25MB).';
        break;
      case 'LIMIT_FILE_COUNT':
        clientMessage = 'Too many files uploaded.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        clientMessage = 'Unexpected file field in upload request.';
        break;
      default:
        clientMessage = 'File upload error. Please check your upload parameters.';
        break;
    }
  }
  // 3. Handle Database Errors
  else if (isDatabaseError) {
    statusCode = 500;
    clientMessage = 'Internal server error occurred.';
  }
  // 4. Handle 4xx Client Errors
  else if (statusCode >= 400 && statusCode < 500) {
    // Sanitize message if it accidentally contains sensitive filesystem or internal info
    if (err.message && !containsSensitiveDetails(err.message)) {
      clientMessage = err.message;
    } else {
      clientMessage = 'Bad request or invalid parameters.';
    }
  }
  // 5. Handle 5xx Server Errors
  else {
    statusCode = 500;
    clientMessage = 'Internal server error occurred.';
  }

  // Server-Side Diagnostic Logging: Log complete details with errorId
  console.error(`[Server Error ${errorId}]`, {
    errorId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userId: req.user?.id || null,
    statusCode,
    name: err.name || 'Error',
    message: err.message,
    ...(err.code && { code: err.code }),
    ...(err.sqlMessage && { sqlMessage: err.sqlMessage }),
    ...(err.sql && { sql: err.sql }),
    stack: err.stack
  });

  // Client Response: Absolutely NO stack traces, internal paths, or SQL queries
  const responsePayload = {
    success: false,
    message: clientMessage
  };

  // Attach correlation ID for 5xx errors so client can report it to support/ops
  if (statusCode >= 500) {
    responsePayload.errorId = errorId;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  errorHandler,
  containsSensitiveDetails,
  SENSITIVE_PATTERNS
};
