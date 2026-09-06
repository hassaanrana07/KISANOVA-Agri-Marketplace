const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

const validateMediaContent = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const buffer = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);

  if (bytesRead >= 2) {
    // Windows PE/EXE/DLL: MZ (0x4D, 0x5A)
    if (buffer[0] === 0x4D && buffer[1] === 0x5A) {
      if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) {} }
      throw new Error('Executable binary files (.exe) are strictly prohibited.');
    }
  }

  if (bytesRead >= 4) {
    // Linux ELF: 0x7F, 'E', 'L', 'F'
    if (buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
      if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) {} }
      throw new Error('Executable binary files (ELF) are strictly prohibited.');
    }
  }

  const headerStr = buffer.toString('utf8', 0, Math.min(bytesRead, 8)).toLowerCase();
  if (headerStr.startsWith('<?php') || headerStr.startsWith('#!/') || headerStr.startsWith('<script')) {
    if (fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (e) {} }
    throw new Error('Script execution payloads are strictly prohibited.');
  }
};

/**
 * Upload a local file to Cloudinary or serve from local static path
 * @param {string} filePath Local path to temporary/uploaded file
 * @param {object} options Options { resource_type: 'image' | 'video' | 'auto', folder: 'kisanova' }
 * @returns {Promise<{ url: string, public_id?: string, format?: string }>}
 */
const uploadMedia = async (filePath, options = {}) => {
  validateMediaContent(filePath);
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: options.folder || process.env.CLOUDINARY_FOLDER || 'kisanova_media',
        resource_type: options.resource_type || 'auto'
      });

      // Cleanup local temp file after Cloudinary upload
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format
      };
    } catch (err) {
      console.error('Cloudinary upload failed:', err.message);
      // In production or when Cloudinary is configured, throw clear error to avoid silent data loss on ephemeral disk
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
  uploadsDir,
  isCloudinaryConfigured
};
