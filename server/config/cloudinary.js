const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a buffer/stream to Cloudinary
 */
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'cloudgallery',
        resource_type: options.resource_type || 'image',
        // HEIC/HEIF (iPhone) accepted; Cloudinary stores original and serves JPG/WebP via fetch_format
        transformation: options.skipTransform
          ? undefined
          : [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Generate optimized thumbnail URL
 */
const getThumbnailUrl = (publicId, width = 400) => {
  return cloudinary.url(publicId, {
    width,
    height: width,
    crop: 'fill',
    quality: 'auto:good',
    fetch_format: 'auto',
  });
};

/**
 * Build a Cloudinary URL with optional text + logo watermark overlays.
 * Applied at delivery time so originals stay clean in storage.
 */
const getWatermarkedUrl = (publicId, gallery = {}) => {
  if (!publicId) return null;
  if (!gallery.watermark_enabled) {
    return cloudinary.url(publicId, {
      quality: 'auto:best',
      fetch_format: 'auto',
      secure: true,
    });
  }

  const gravity = gallery.watermark_position || 'south_east';
  const opacity = Math.min(100, Math.max(10, parseInt(gallery.watermark_opacity, 10) || 50));
  const transformation = [];

  // Logo overlay (public_id uses : instead of / in overlays)
  if (gallery.watermark_logo_public_id) {
    const overlayId = String(gallery.watermark_logo_public_id).replace(/\//g, ':');
    transformation.push({
      overlay: overlayId,
      gravity,
      opacity,
      width: 200,
      flags: 'relative',
      x: 20,
      y: 20,
    });
  }

  // Text watermark
  if (gallery.watermark_text && String(gallery.watermark_text).trim()) {
    const text = String(gallery.watermark_text).trim().slice(0, 80);
    transformation.push({
      overlay: {
        font_family: 'Arial',
        font_size: 36,
        font_weight: 'bold',
        text,
      },
      gravity: gallery.watermark_logo_public_id ? 'south' : gravity,
      opacity,
      color: 'white',
      x: 20,
      y: 20,
    });
  }

  // If enabled but no text/logo, still return clean high-quality URL
  if (transformation.length === 0) {
    return cloudinary.url(publicId, {
      quality: 'auto:best',
      fetch_format: 'auto',
      secure: true,
    });
  }

  return cloudinary.url(publicId, {
    transformation: [
      ...transformation,
      { quality: 'auto:best' },
      { fetch_format: 'auto' },
    ],
    secure: true,
  });
};

/**
 * Delete image from Cloudinary
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  getThumbnailUrl,
  getWatermarkedUrl,
  deleteFromCloudinary,
};
