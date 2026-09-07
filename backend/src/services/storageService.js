const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Ensure local uploads directory exists outside public web root
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
}

// Configure Cloudinary if credentials are present
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('☁️ Cloudinary configured for media storage');
} else {
  console.log('📁 Using local disk storage fallback for media uploads (/uploads)');
}

// Maximum allowed sizes: 5MB for images, 25MB for videos
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5MB
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;  // 25MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm'
]);

const EXTENSION_TO_MIMES = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm']
};

/**
 * Safely unlinks a file from disk if it exists
 */
const unlinkSafe = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // Ignore cleanup error if already removed
    }
  }
};

/**
 * Inspects binary magic bytes to determine true file type
 * @param {Buffer} buffer 
 * @returns {string|null} Detected MIME type or null if unrecognized
 */
const detectFileTypeFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // 3. WebP: 'RIFF' .... 'WEBP'
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50   // WEBP
  ) {
    return 'image/webp';
  }

  // 4. MP4: 'ftyp' at offset 4..7
  if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70 // ftyp
  ) {
    return 'video/mp4';
  }

  // 5. WebM / Matroska: 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3
  ) {
    return 'video/webm';
  }

  return null;
};

/**
 * Deep inspection of file content for malicious code, polyglots, webshells, or scripts.
 * @param {string} filePath Path to uploaded file on disk
 * @param {string} [claimedExt] Optional claimed file extension (e.g. '.jpg')
 */
const validateMediaContent = (filePath, claimedExt) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('Uploaded file does not exist on disk.');
  }

  const stat = fs.statSync(filePath);
  const ext = (claimedExt || path.extname(filePath)).toLowerCase().trim();

  // 1. Tiered Size Validation
  const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  const isVideo = ['.mp4', '.webm'].includes(ext);

  if (isImage && stat.size > MAX_IMAGE_SIZE) {
    unlinkSafe(filePath);
    throw new Error(`Image size (${(stat.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowable limit (5MB).`);
  }

  if (isVideo && stat.size > MAX_VIDEO_SIZE) {
    unlinkSafe(filePath);
    throw new Error(`Video size (${(stat.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowable limit (25MB).`);
  }

  // 2. Read first 4096 bytes for magic bytes and deep content analysis
  const readLength = Math.min(stat.size, 4096);
  if (readLength < 12) {
    unlinkSafe(filePath);
    throw new Error('Security Error: Uploaded file is empty or too small to be valid media.');
  }

  const buffer = Buffer.alloc(readLength);
  const fd = fs.openSync(filePath, 'r');
  const bytesRead = fs.readSync(fd, buffer, 0, readLength, 0);
  fs.closeSync(fd);

  // 3. Executable binary detection
  // Windows PE / MZ
  if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
    unlinkSafe(filePath);
    throw new Error('Security Error: Windows executable binary files (.exe, .dll) are strictly forbidden.');
  }

  // Linux ELF
  if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    unlinkSafe(filePath);
    throw new Error('Security Error: Linux executable binary files (ELF) are strictly forbidden.');
  }

  // Java Class bytecode (CA FE BA BE)
  if (buffer[0] === 0xCA && buffer[1] === 0xFE && buffer[2] === 0xBA && buffer[3] === 0xBE) {
    unlinkSafe(filePath);
    throw new Error('Security Error: Compiled bytecode files (.class) are strictly forbidden.');
  }

  // 4. Validate Magic Bytes Against Allowed Media Types
  const detectedMime = detectFileTypeFromBuffer(buffer);
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    unlinkSafe(filePath);
    throw new Error(`Security Error: Invalid or spoofed file content. Magic bytes do not correspond to an allowed media type.`);
  }

  // 5. Cross-check detected type against claimed extension
  const allowedMimesForExt = EXTENSION_TO_MIMES[ext];
  if (!allowedMimesForExt || !allowedMimesForExt.includes(detectedMime)) {
    unlinkSafe(filePath);
    throw new Error(`Security Error: Extension mismatch. File with extension "${ext}" contains content of type "${detectedMime}".`);
  }

  // 6. Deep Content Scanning for Injected Scripts, Web Shells, and HTML Polyglots
  const textChunk = buffer.toString('utf8').toLowerCase();

  const dangerousPatterns = [
    /<\?php/i,
    /<\?=/i,
    /<%/i,
    /<script[\s>]/i,
    /<html[\s>]/i,
    /<body[\s>]/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
    /<embed[\s>]/i,
    /<svg[\s>]/i,
    /<\?xml/i,
    /\bjavascript:/i,
    /\bvbscript:/i,
    /\bdata:text\/html/i,
    /\bonerror\s*=/i,
    /\bonload\s*=/i,
    /\bonclick\s*=/i,
    /\beval\s*\(/i,
    /\bbase64_decode\s*\(/i,
    /\bshell_exec\s*\(/i,
    /\bsystem\s*\(/i,
    /\bpassthru\s*\(/i,
    /<!--#exec/i,
    /^#!\//
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(textChunk)) {
      unlinkSafe(filePath);
      throw new Error('Security Error: File content contains dangerous executable patterns or forbidden script payloads.');
    }
  }

  // 7. Ensure file has non-executable permissions on disk (read/write only)
  try {
    fs.chmodSync(filePath, 0o644);
  } catch (e) {
    // Non-fatal on Windows
  }
};

/**
 * Upload a local file to Cloudinary or serve from local static path
 * @param {string} filePath Local path to temporary/uploaded file
 * @param {object} options Options { resource_type: 'image' | 'video' | 'auto', folder: 'kisanova', originalExtension: string }
 * @returns {Promise<{ url: string, public_id?: string, format?: string }>}
 */
const uploadMedia = async (filePath, options = {}) => {
  validateMediaContent(filePath, options.originalExtension);

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: options.folder || process.env.CLOUDINARY_FOLDER || 'kisanova_media',
        resource_type: options.resource_type || 'auto'
      });

      // Cleanup local temp file after Cloudinary upload
      unlinkSafe(filePath);

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format
      };
    } catch (err) {
      console.error('Cloudinary upload failed:', err.message);
      unlinkSafe(filePath);
      if (process.env.NODE_ENV === 'production' || isCloudinaryConfigured) {
        throw new Error(`Media storage upload failed: ${err.message}`);
      }
    }
  }

  // Fallback to local file URL (Development only when Cloudinary is not configured)
  const filename = path.basename(filePath);
  return {
    url: `/uploads/${filename}`,
    public_id: filename,
    format: path.extname(filename).replace('.', '')
  };
};

module.exports = {
  uploadMedia,
  validateMediaContent,
  detectFileTypeFromBuffer,
  unlinkSafe,
  uploadsDir,
  isCloudinaryConfigured,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  ALLOWED_MIME_TYPES,
  EXTENSION_TO_MIMES
};
