const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const {
  uploadsDir,
  validateMediaContent,
  unlinkSafe,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE
} = require('../services/storageService');

// Whitelisted file extensions and corresponding MIME types
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm']);
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm'
]);

// Configure disk storage with randomized filenames and strict directory isolation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Null byte injection check
    if (file.originalname.includes('\0')) {
      return cb(new Error('Security Error: Null byte injection in filename detected.'));
    }

    // Path traversal check
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      // Clean base name explicitly
    }

    const ext = path.extname(file.originalname).toLowerCase().trim();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Security Error: Forbidden file extension "${ext}". Allowed: .jpg, .jpeg, .png, .webp, .mp4, .webm`));
    }

    // Sanitize base name to alphanumeric only, preventing path traversal
    const rawBase = path.basename(file.originalname, ext);
    const baseName = rawBase.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
    const safeFilename = `${file.fieldname}-${baseName || 'upload'}-${uniqueSuffix}${ext}`;
    cb(null, safeFilename);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().trim();
  const mime = (file.mimetype || '').toLowerCase().trim();

  // Validate both extension and MIME type match the whitelist
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIMETYPES.has(mime)) {
    return cb(
      new Error(`Unsupported file type. Allowed formats: JPG, PNG, WEBP, MP4, WEBM.`),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE // 25MB ceiling (tiered: images validated to 5MB in content check)
  },
  fileFilter: fileFilter
});

/**
 * Middleware: Validates content, magic bytes, and tiered sizes of uploaded files on disk.
 * Immediately unlinks any invalid, spoofed, or malicious files and returns HTTP 400.
 */
const validateUploadedFiles = (req, res, next) => {
  const filesToValidate = [];

  if (req.file) {
    filesToValidate.push(req.file);
  }

  if (Array.isArray(req.files)) {
    filesToValidate.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    for (const key of Object.keys(req.files)) {
      if (Array.isArray(req.files[key])) {
        filesToValidate.push(...req.files[key]);
      }
    }
  }

  // If no files were uploaded in this request, proceed normally
  if (filesToValidate.length === 0) {
    return next();
  }

  try {
    for (const file of filesToValidate) {
      const originalExt = path.extname(file.originalname).toLowerCase().trim();
      validateMediaContent(file.path, originalExt);
    }
    next();
  } catch (err) {
    // Cleanup any files that were written to disk in this request
    for (const file of filesToValidate) {
      unlinkSafe(file.path);
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid or dangerous file upload.'
    });
  }
};

module.exports = {
  upload,
  validateUploadedFiles,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIMETYPES
};
