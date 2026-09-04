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

/**
 * Upload a local file to Cloudinary or serve from local static path
 * @param {string} filePath Local path to temporary/uploaded file
 * @param {object} options Options { resource_type: 'image' | 'video' | 'auto', folder: 'kisanova' }
 * @returns {Promise<{ url: string, public_id?: string, format?: string }>}
 */
const uploadMedia = async (filePath, options = {}) => {
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
      console.error('Cloudinary upload failed, falling back to local file:', err.message);
    }
  }

  // Fallback to local file URL
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
