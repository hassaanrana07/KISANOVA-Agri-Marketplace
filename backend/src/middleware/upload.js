const multer = require('multer');
const path = require('path');
const { uploadsDir } = require('../services/storageService');

// Whitelisted file extensions and corresponding MIME types
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm']);
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm'
]);

// Configure disk storage with sanitized filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Sanitize extension
    const ext = path.extname(file.originalname).toLowerCase().trim();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Security Error: Forbidden file extension "${ext}".`));
    }

    // Sanitize base name to alphanumeric only, preventing path traversal
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 30);

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeFilename = `${file.fieldname}-${baseName || 'upload'}-${uniqueSuffix}${ext}`;
    cb(null, safeFilename);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().trim();
  const mime = file.mimetype.toLowerCase().trim();

  // Validate both extension and MIME type match the whitelist
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIMETYPES.has(mime)) {
    return cb(
      new Error(`Unsupported or dangerous file type. Allowed formats: JPG, PNG, WEBP, MP4, WEBM. Received: ${ext} (${mime})`),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB hard ceiling (images typically < 5MB, videos < 25MB)
  },
  fileFilter: fileFilter
});

module.exports = upload;
