const multer = require('multer');
const path = require('path');
const { uploadsDir } = require('../services/storageService');

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Allowed file formats
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

const fileFilter = (req, file, cb) => {
  if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPG, PNG, WEBP, MP4, WEBM`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB maximum
  },
  fileFilter: fileFilter
});

module.exports = upload;
