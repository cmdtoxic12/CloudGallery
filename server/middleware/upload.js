const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 25) * 1024 * 1024;
const MAX_FILES = parseInt(process.env.MAX_FILES_PER_UPLOAD) || 20;

// iPhone / modern camera formats
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/avif',
  'image/tiff',
  'image/x-adobe-dng',
  // Some mobile browsers send HEIC with empty or generic type
  'application/octet-stream',
]);

const allowedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.hif',
  '.avif',
  '.tif',
  '.tiff',
  '.dng',
]);

function isAllowedImage(file) {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (allowedMimeTypes.has(mime) && mime !== 'application/octet-stream') {
    return true;
  }

  // Fallback: trust extension (critical for iOS HEIC with blank/octet-stream MIME)
  if (allowedExtensions.has(ext)) {
    return true;
  }

  return false;
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (isAllowedImage(file)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type (${file.mimetype || 'unknown'}${path.extname(file.originalname || '')}). Allowed: JPG, PNG, WebP, HEIC/HEIF (iPhone), AVIF`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 25}MB`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Too many files. Maximum is ${MAX_FILES} files per upload`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { upload, handleUploadError, isAllowedImage };
