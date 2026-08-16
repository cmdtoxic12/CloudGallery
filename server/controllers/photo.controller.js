const { query } = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary, getThumbnailUrl } = require('../config/cloudinary');

const uploadPhotos = async (req, res) => {
  try {
    const { galleryId } = req.body;

    if (!galleryId) {
      return res.status(400).json({ success: false, message: 'Gallery ID is required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Verify ownership
    const galleryCheck = await query(
      'SELECT id, owner_id, cover_photo_url FROM galleries WHERE id = $1',
      [galleryId]
    );

    if (galleryCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }
    if (galleryCheck.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const uploadedPhotos = [];
    let totalSize = 0;

    for (const file of req.files) {
      try {
        const result = await uploadToCloudinary(file.buffer, {
          folder: `cloudgalary/${galleryId}`,
          public_id: undefined, // let Cloudinary generate
        });

        const thumbnailUrl = getThumbnailUrl(result.public_id, 400);

        const photoResult = await query(
          `INSERT INTO photos (
             gallery_id, user_id, file_name, image_url, thumbnail_url,
             public_id, file_size, width, height
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            galleryId,
            req.user.id,
            file.originalname,
            result.secure_url,
            thumbnailUrl,
            result.public_id,
            result.bytes,
            result.width,
            result.height,
          ]
        );

        uploadedPhotos.push(photoResult.rows[0]);
        totalSize += result.bytes;

        // Set cover if gallery has none
        if (!galleryCheck.rows[0].cover_photo_url && uploadedPhotos.length === 1) {
          await query(
            'UPDATE galleries SET cover_photo_url = $1 WHERE id = $2',
            [thumbnailUrl, galleryId]
          );
        }
      } catch (uploadErr) {
        console.error('Single file upload error:', uploadErr.message);
        // Continue with remaining files
      }
    }

    // Update user storage
    if (totalSize > 0) {
      await query(
        'UPDATE users SET storage_used = storage_used + $1 WHERE id = $2',
        [totalSize, req.user.id]
      );
    }

    res.status(201).json({
      success: true,
      message: `${uploadedPhotos.length} photo(s) uploaded successfully`,
      data: { photos: uploadedPhotos },
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

const getGalleryPhotos = async (req, res) => {
  try {
    const { galleryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;

    // Check gallery access
    const galleryResult = await query(
      'SELECT id, owner_id, visibility, password_hash FROM galleries WHERE id = $1',
      [galleryId]
    );

    if (galleryResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }

    const gallery = galleryResult.rows[0];

    if (gallery.visibility === 'private') {
      if (!req.user || req.user.id !== gallery.owner_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const countResult = await query(
      'SELECT COUNT(*)::int AS total FROM photos WHERE gallery_id = $1 AND is_deleted = FALSE',
      [galleryId]
    );

    const result = await query(
      `SELECT p.*,
              EXISTS(
                SELECT 1 FROM favorites f
                WHERE f.photo_id = p.id AND f.user_id = $1
              ) AS is_favorited
       FROM photos p
       WHERE p.gallery_id = $2 AND p.is_deleted = FALSE
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.user?.id || null, galleryId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        photos: result.rows,
        pagination: {
          page,
          limit,
          total: countResult.rows[0].total,
          totalPages: Math.ceil(countResult.rows[0].total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch photos' });
  }
};

const getPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, g.owner_id, g.visibility, g.slug
       FROM photos p
       JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = $1 AND p.is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    const photo = result.rows[0];

    if (photo.visibility === 'private' && (!req.user || req.user.id !== photo.owner_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Increment view
    await query('UPDATE photos SET views = views + 1 WHERE id = $1', [id]);

    res.json({ success: true, data: { photo } });
  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch photo' });
  }
};

const deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, g.owner_id
       FROM photos p
       JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    const photo = result.rows[0];
    if (photo.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Soft delete
    await query(
      'UPDATE photos SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1',
      [id]
    );

    // Optionally hard delete from Cloudinary after a grace period
    // For now we keep the file for potential restore

    // Update storage
    await query(
      'UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2',
      [photo.file_size, req.user.id]
    );

    res.json({ success: true, message: 'Photo moved to trash' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete photo' });
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;

    const photoCheck = await query(
      'SELECT id FROM photos WHERE id = $1 AND is_deleted = FALSE',
      [id]
    );
    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    const existing = await query(
      'SELECT id FROM favorites WHERE user_id = $1 AND photo_id = $2',
      [req.user.id, id]
    );

    if (existing.rows.length > 0) {
      await query('DELETE FROM favorites WHERE user_id = $1 AND photo_id = $2', [
        req.user.id,
        id,
      ]);
      return res.json({ success: true, message: 'Removed from favorites', data: { favorited: false } });
    }

    await query('INSERT INTO favorites (user_id, photo_id) VALUES ($1, $2)', [
      req.user.id,
      id,
    ]);
    res.json({ success: true, message: 'Added to favorites', data: { favorited: true } });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to update favorite' });
  }
};

const getFavorites = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, g.name AS gallery_name, g.slug AS gallery_slug
       FROM favorites f
       JOIN photos p ON p.id = f.photo_id
       JOIN galleries g ON g.id = p.gallery_id
       WHERE f.user_id = $1 AND p.is_deleted = FALSE
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: { photos: result.rows } });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
  }
};

const trackDownload = async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE photos SET downloads = downloads + 1 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

module.exports = {
  uploadPhotos,
  getGalleryPhotos,
  getPhoto,
  deletePhoto,
  toggleFavorite,
  getFavorites,
  trackDownload,
};
