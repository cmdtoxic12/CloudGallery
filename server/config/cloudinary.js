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
const getWatermarkedUrl = (publicId, gallery = {}, opts = {}) => {
  if (!publicId) return null;

  // fl_attachment forces Content-Disposition: attachment; Cloudinary adds the correct extension
  const flags = opts.attachment
    ? `attachment:${String(opts.attachment).replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '_')}`
    : undefined;

  const deliver = (extra) =>
    cloudinary.url(publicId, { transformation: extra, flags, secure: true });

  if (!gallery.watermark_enabled) {
    // Note: skip fetch_format:'auto' here so downloads keep the ORIGINAL format
    // (otherwise visitors may get a .webp file named .jpg)
    return deliver([{ quality: 'auto:best' }]);
  }

  const gravity = gallery.watermark_position || 'south_east';
  const opacity = Math.min(100, Math.max(10, parseInt(gallery.watermark_opacity, 10) || 50));
  const transformation = [];

  if (gallery.watermark_logo_public_id) {
    transformation.push({
      overlay: String(gallery.watermark_logo_public_id).replace(/\//g, ':'),
      gravity, opacity, width: 200, flags: 'relative', x: 20, y: 20,
    });
  }

  if (gallery.watermark_text && String(gallery.watermark_text).trim()) {
    transformation.push({
      overlay: { font_family: 'Arial', font_size: 36, font_weight: 'bold',
                 text: String(gallery.watermark_text).trim().slice(0, 80) },
      gravity: gallery.watermark_logo_public_id ? 'south' : gravity,
      opacity, color: 'white', x: 20, y: 20,
    });
  }

  if (transformation.length === 0) {
    return deliver([{ quality: 'auto:best' }]);
  }

  return deliver([...transformation, { quality: 'auto:best' }]);
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
