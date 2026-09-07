/**
 * ============================================================================
 * KISANOVA AGRI MARKETPLACE — STRICT INPUT VALIDATION ENGINE
 * ============================================================================
 * 
 * Enforces strict schema contracts against request bodies, query parameters,
 * and path parameters. Validates exact data types, length constraints, bounds,
 * and formats (regex, email, enums).
 * 
 * Rejects invalid, malformed, or unauthorized/extra inputs with HTTP 400 Bad Request.
 * Does NOT silently coerce bad data or sanitize in place.
 */

// Strict RFC 5322 compatible email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard phone regex: optional '+' followed by digits, spaces, hyphens (7 to 25 chars)
const PHONE_REGEX = /^\+?[0-9\s-]{7,25}$/;

// Hexadecimal string regex
const HEX_REGEX = /^[0-9a-fA-F]+$/;

// Strict URL regex (HTTP, HTTPS, or relative uploaded media /uploads/...)
const URL_OR_PATH_REGEX = /^(https?:\/\/[^\s/$.?#].[^\s]*|\/uploads\/[a-zA-Z0-9._-]+)$/i;

/**
 * Validate an individual field against a rule definition.
 * 
 * @param {string} fieldName - Name of the property
 * @param {*} value - The value to inspect
 * @param {object} rule - Rule definition
 * @param {string} location - 'body', 'query', or 'params'
 * @param {object} req - Express request
 * @returns {string|null} - Error message if invalid, null if valid
 */
const validateField = (fieldName, value, rule, location, req) => {
  const isUndefinedOrNull = value === undefined || value === null;
  const isEmptyString = typeof value === 'string' && value.trim() === '';

  // 1. Required Check
  if (rule.required) {
    if (isUndefinedOrNull || isEmptyString) {
      return rule.message || `Field '${fieldName}' in ${location} is required and cannot be empty.`;
    }
  } else {
    // Optional field: if not present, validation passes
    if (isUndefinedOrNull || (isEmptyString && rule.allowEmpty !== true)) {
      return null;
    }
  }

  // 2. Type & Coercion Check
  const expectedType = rule.type || 'string';
  const shouldCoerce = rule.coerce ?? (location === 'query' || location === 'params');

  let inspectedValue = value;

  switch (expectedType) {
    case 'string':
      if (typeof inspectedValue !== 'string') {
        return `Field '${fieldName}' must be a string, received ${typeof inspectedValue}.`;
      }
      break;

    case 'number':
      if (shouldCoerce && typeof inspectedValue === 'string') {
        if (!/^-?\d+(\.\d+)?$/.test(inspectedValue.trim())) {
          return `Field '${fieldName}' must be a valid number.`;
        }
        inspectedValue = Number(inspectedValue.trim());
      } else if (typeof inspectedValue !== 'number' || !Number.isFinite(inspectedValue)) {
        return `Field '${fieldName}' must be a finite number.`;
      }
      break;

    case 'integer':
      if (shouldCoerce && typeof inspectedValue === 'string') {
        if (!/^-?\d+$/.test(inspectedValue.trim())) {
          return `Field '${fieldName}' must be an integer.`;
        }
        inspectedValue = parseInt(inspectedValue.trim(), 10);
      } else if (typeof inspectedValue !== 'number' || !Number.isInteger(inspectedValue)) {
        return `Field '${fieldName}' must be an integer.`;
      }
      break;

    case 'positiveInt':
      if (shouldCoerce && typeof inspectedValue === 'string') {
        if (!/^[1-9]\d*$/.test(inspectedValue.trim())) {
          return `Field '${fieldName}' must be a positive integer greater than 0.`;
        }
        inspectedValue = parseInt(inspectedValue.trim(), 10);
      } else if (typeof inspectedValue !== 'number' || !Number.isInteger(inspectedValue) || inspectedValue <= 0) {
        return `Field '${fieldName}' must be a positive integer greater than 0.`;
      }
      break;

    case 'boolean':
      if (shouldCoerce && typeof inspectedValue === 'string') {
        const lower = inspectedValue.trim().toLowerCase();
        if (lower === 'true' || lower === '1') {
          inspectedValue = true;
        } else if (lower === 'false' || lower === '0') {
          inspectedValue = false;
        } else {
          return `Field '${fieldName}' must be a boolean ('true' or 'false').`;
        }
      } else if (typeof inspectedValue !== 'boolean') {
        return `Field '${fieldName}' must be a boolean.`;
      }
      break;

    case 'array':
      if (!Array.isArray(inspectedValue)) {
        return `Field '${fieldName}' must be an array.`;
      }
      break;

    case 'object':
      if (typeof inspectedValue !== 'object' || inspectedValue === null || Array.isArray(inspectedValue)) {
        return `Field '${fieldName}' must be an object.`;
      }
      break;

    default:
      break;
  }

  // 3. Length & Bounds Constraints
  if (typeof inspectedValue === 'string' || Array.isArray(inspectedValue)) {
    const len = inspectedValue.length;
    if (rule.min !== undefined && len < rule.min) {
      return `Field '${fieldName}' length must be at least ${rule.min}, received length ${len}.`;
    }
    if (rule.max !== undefined && len > rule.max) {
      return `Field '${fieldName}' length cannot exceed ${rule.max}, received length ${len}.`;
    }
    if (rule.exactLength !== undefined && len !== rule.exactLength) {
      return `Field '${fieldName}' must be exactly ${rule.exactLength} characters long.`;
    }
  }

  if (typeof inspectedValue === 'number') {
    if (rule.min !== undefined && inspectedValue < rule.min) {
      return `Field '${fieldName}' value must be at least ${rule.min}, received ${inspectedValue}.`;
    }
    if (rule.max !== undefined && inspectedValue > rule.max) {
      return `Field '${fieldName}' value cannot exceed ${rule.max}, received ${inspectedValue}.`;
    }
  }

  // 4. Format Constraints
  if (typeof inspectedValue === 'string') {
    const trimmed = inspectedValue.trim();

    if (rule.format === 'email') {
      if (!EMAIL_REGEX.test(trimmed)) {
        return `Field '${fieldName}' must be a valid email address format.`;
      }
    }

    if (rule.format === 'phone') {
      if (!PHONE_REGEX.test(trimmed)) {
        return `Field '${fieldName}' must be a valid phone number format.`;
      }
    }

    if (rule.format === 'hex') {
      if (!HEX_REGEX.test(trimmed)) {
        return `Field '${fieldName}' must contain only hexadecimal characters.`;
      }
    }

    if (rule.format === 'url') {
      if (!URL_OR_PATH_REGEX.test(trimmed)) {
        return `Field '${fieldName}' must be a valid URL or media storage path.`;
      }
    }

    if (rule.pattern && !rule.pattern.test(inspectedValue)) {
      return rule.patternMessage || `Field '${fieldName}' does not match the required pattern format.`;
    }
  }

  // 5. Enum Allowed Values Check
  if (rule.enum && Array.isArray(rule.enum)) {
    if (!rule.enum.includes(inspectedValue)) {
      return `Field '${fieldName}' must be one of: [${rule.enum.join(', ')}]. Received "${inspectedValue}".`;
    }
  }

  // 6. Custom Validator Function
  if (typeof rule.custom === 'function') {
    const customResult = rule.custom(inspectedValue, req);
    if (customResult !== true) {
      return typeof customResult === 'string' ? customResult : `Field '${fieldName}' failed validation.`;
    }
  }

  // 7. Array Item Constraints (if array items rule is defined)
  if (Array.isArray(inspectedValue) && rule.items) {
    for (let i = 0; i < inspectedValue.length; i++) {
      const itemError = validateField(`${fieldName}[${i}]`, inspectedValue[i], rule.items, location, req);
      if (itemError) return itemError;
    }
  }

  return null;
};

/**
 * Validate an entire container (body, query, params) against a schema.
 */
const validateContainer = (container, schema, location, disallowUnknown, req) => {
  const errors = [];
  const target = container || {};

  // Check for unknown properties (strict schema rejection)
  if (disallowUnknown && typeof target === 'object' && !Array.isArray(target)) {
    const allowedKeys = new Set(Object.keys(schema));
    for (const key of Object.keys(target)) {
      if (!allowedKeys.has(key)) {
        errors.push({
          field: key,
          location,
          message: `Unknown or unauthorized property '${key}' is not allowed in ${location}.`
        });
      }
    }
  }

  // Validate each schema rule
  for (const [fieldName, rule] of Object.entries(schema)) {
    const errorMsg = validateField(fieldName, target[fieldName], rule, location, req);
    if (errorMsg) {
      errors.push({
        field: fieldName,
        location,
        message: errorMsg
      });
    }
  }

  return errors;
};

/**
 * Express Middleware Generator for Strict Schema Validation
 * 
 * @param {object} options
 * @param {object} [options.body] - Schema for req.body
 * @param {object} [options.query] - Schema for req.query
 * @param {object} [options.params] - Schema for req.params
 * @param {boolean} [options.disallowUnknown=true] - Reject unknown fields in body
 */
const validate = ({
  body = null,
  query = null,
  params = null,
  disallowUnknown = true
} = {}) => {
  return (req, res, next) => {
    const allErrors = [];

    // 1. Validate Path Parameters
    if (params) {
      const paramErrors = validateContainer(req.params, params, 'params', false, req);
      allErrors.push(...paramErrors);
    }

    // 2. Validate Query Parameters
    if (query) {
      const queryErrors = validateContainer(req.query, query, 'query', false, req);
      allErrors.push(...queryErrors);
    }

    // 3. Validate Request Body
    if (body) {
      const bodyErrors = validateContainer(req.body, body, 'body', disallowUnknown, req);
      allErrors.push(...bodyErrors);
    }

    if (allErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${allErrors[0].message}`,
        errors: allErrors
      });
    }

    next();
  };
};

module.exports = {
  validate,
  validateField,
  EMAIL_REGEX,
  PHONE_REGEX,
  HEX_REGEX,
  URL_OR_PATH_REGEX
};
