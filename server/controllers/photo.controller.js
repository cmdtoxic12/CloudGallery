const archiver = require('archiver');
const https = require('https');
const http = require('http');
const { query } = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary, getThumbnailUrl, getWatermarkedUrl } = require('../config/cloudinary');

const uploadPhotos = async (req, res) => {
  try {
    const { galleryId } = req.body;

    if (!galleryId) {
      return res.status(400).json({ success: false, message: 'Gallery ID is required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

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
          folder: `cloudgallery/${galleryId}`,
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

        if (!galleryCheck.rows[0].cover_photo_url && uploadedPhotos.length === 1) {
          await query(
            'UPDATE galleries SET cover_photo_url = $1 WHERE id = $2',
            [thumbnailUrl, galleryId]
          );
        }
      } catch (uploadErr) {
        console.error('Single file upload error:', uploadErr.message);
      }
    }

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
    const includeDeleted = req.query.trash === '1' || req.query.trash === 'true';

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

    // Only owner can see trash
    const deletedFilter = includeDeleted && req.user && req.user.id === gallery.owner_id
      ? 'p.is_deleted = TRUE'
      : 'p.is_deleted = FALSE';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM photos p WHERE p.gallery_id = $1 AND ${deletedFilter}`,
      [galleryId]
    );

    const result = await query(
      `SELECT p.*,
              EXISTS(
                SELECT 1 FROM favorites f
                WHERE f.photo_id = p.id AND f.user_id = $1
              ) AS is_favorited
       FROM photos p
       WHERE p.gallery_id = $2 AND ${deletedFilter}
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

    await query('UPDATE photos SET views = views + 1 WHERE id = $1', [id]);

    res.json({ success: true, data: { photo } });
  } catch (error) {
    console.error('Get photo error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch photo' });
  }
};

/** Soft-delete a single photo */
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

    if (photo.is_deleted) {
      return res.json({ success: true, message: 'Photo already in trash' });
    }

    await query(
      'UPDATE photos SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1',
      [id]
    );

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

/** Soft-delete multiple photos */
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Photo IDs required' });
    }

    // Verify ownership for all
    const result = await query(
      `SELECT p.id, p.file_size, p.is_deleted, g.owner_id
       FROM photos p
       JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = ANY($1::uuid[])`,
      [ids]
    );

    const owned = result.rows.filter((r) => r.owner_id === req.user.id && !r.is_deleted);
    if (owned.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching photos found' });
    }

    const ownedIds = owned.map((r) => r.id);
    const totalSize = owned.reduce((sum, r) => sum + Number(r.file_size || 0), 0);

    await query(
      `UPDATE photos SET is_deleted = TRUE, deleted_at = NOW() WHERE id = ANY($1::uuid[])`,
      [ownedIds]
    );

    if (totalSize > 0) {
      await query(
        'UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2',
        [totalSize, req.user.id]
      );
    }

    res.json({
      success: true,
      message: `${ownedIds.length} photo(s) moved to trash`,
      data: { deleted: ownedIds.length },
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: 'Bulk delete failed' });
  }
};

/** Permanently delete photos from DB + Cloudinary */
const purgePhotos = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Photo IDs required' });
    }

    const result = await query(
      `SELECT p.id, p.public_id, p.file_size, p.is_deleted, g.owner_id
       FROM photos p
       JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = ANY($1::uuid[])`,
      [ids]
    );

    const owned = result.rows.filter((r) => r.owner_id === req.user.id);
    if (owned.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching photos found' });
    }

    let purged = 0;
    let cloudinaryErrors = 0;

    for (const photo of owned) {
      try {
        if (photo.public_id) {
          await deleteFromCloudinary(photo.public_id);
        }
      } catch (err) {
        console.error('Cloudinary purge error for', photo.public_id, err.message);
        cloudinaryErrors += 1;
      }

      await query('DELETE FROM photos WHERE id = $1', [photo.id]);
      purged += 1;

      // Only subtract storage if it was still active (not already soft-deleted)
      if (!photo.is_deleted && photo.file_size) {
        await query(
          'UPDATE users SET storage_used = GREATEST(0, storage_used - $1) WHERE id = $2',
          [photo.file_size, req.user.id]
        );
      }
    }

    res.json({
      success: true,
      message: `${purged} photo(s) permanently deleted`,
      data: { purged, cloudinaryErrors },
    });
  } catch (error) {
    console.error('Purge photos error:', error);
    res.status(500).json({ success: false, message: 'Permanent delete failed' });
  }
};

/** Restore soft-deleted photos */
const restorePhotos = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Photo IDs required' });
    }

    const result = await query(
      `SELECT p.id, p.file_size, p.is_deleted, g.owner_id
       FROM photos p
       JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = ANY($1::uuid[]) AND p.is_deleted = TRUE`,
      [ids]
    );

    const owned = result.rows.filter((r) => r.owner_id === req.user.id);
    if (owned.length === 0) {
      return res.status(404).json({ success: false, message: 'No matching trashed photos found' });
    }

    const ownedIds = owned.map((r) => r.id);
    const totalSize = owned.reduce((sum, r) => sum + Number(r.file_size || 0), 0);

    await query(
      `UPDATE photos SET is_deleted = FALSE, deleted_at = NULL WHERE id = ANY($1::uuid[])`,
      [ownedIds]
    );

    if (totalSize > 0) {
      await query(
        'UPDATE users SET storage_used = storage_used + $1 WHERE id = $2',
        [totalSize, req.user.id]
      );
    }

    res.json({
      success: true,
      message: `${ownedIds.length} photo(s) restored`,
      data: { restored: ownedIds.length },
    });
  } catch (error) {
    console.error('Restore photos error:', error);
    res.status(500).json({ success: false, message: 'Restore failed' });
  }
};

/** Stream a ZIP of selected (or all) photos */
const bulkDownload = async (req, res) => {
  try {
    const { ids, galleryId } = req.body;

    let photos;
    if (Array.isArray(ids) && ids.length > 0) {
      const result = await query(
        `SELECT p.id, p.file_name, p.image_url, p.public_id, g.owner_id, g.visibility,
                g.watermark_enabled, g.watermark_text, g.watermark_logo_public_id,
                g.watermark_position, g.watermark_opacity
         FROM photos p
         JOIN galleries g ON g.id = p.gallery_id
         WHERE p.id = ANY($1::uuid[]) AND p.is_deleted = FALSE`,
        [ids]
      );
      photos = result.rows;
    } else if (galleryId) {
      const result = await query(
        `SELECT p.id, p.file_name, p.image_url, p.public_id, g.owner_id, g.visibility,
                g.watermark_enabled, g.watermark_text, g.watermark_logo_public_id,
                g.watermark_position, g.watermark_opacity
         FROM photos p
         JOIN galleries g ON g.id = p.gallery_id
         WHERE p.gallery_id = $1 AND p.is_deleted = FALSE
         ORDER BY p.created_at ASC`,
        [galleryId]
      );
      photos = result.rows;
    } else {
      return res.status(400).json({ success: false, message: 'Provide photo ids or galleryId' });
    }

    if (!photos || photos.length === 0) {
      return res.status(404).json({ success: false, message: 'No photos found' });
    }

    // Access check: private galleries only for owner
    const first = photos[0];
    if (first.visibility === 'private' && (!req.user || req.user.id !== first.owner_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const zipName = `cloudgallery-${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'ZIP creation failed' });
      }
    });
    archive.pipe(res);

    const usedNames = new Set();
    const fetchImage = (url) =>
      new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib
          .get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
              fetchImage(response.headers.location).then(resolve).catch(reject);
              return;
            }
            if (response.statusCode !== 200) {
              reject(new Error(`HTTP ${response.statusCode}`));
              return;
            }
            const chunks = [];
            response.on('data', (c) => chunks.push(c));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          })
          .on('error', reject);
      });

    for (const photo of photos) {
      try {
        const url = getWatermarkedUrl(photo.public_id, photo) || photo.image_url;
        const buffer = await fetchImage(url);
        let name = photo.file_name || `${photo.id}.jpg`;
        // Avoid duplicate names in zip
        if (usedNames.has(name)) {
          const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
          const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
          let i = 1;
          while (usedNames.has(`${base}-${i}${ext}`)) i += 1;
          name = `${base}-${i}${ext}`;
        }
        usedNames.add(name);
        archive.append(buffer, { name });

        // Track download (fire-and-forget)
        query('UPDATE photos SET downloads = downloads + 1 WHERE id = $1', [photo.id]).catch(() => {});
      } catch (err) {
        console.error('Failed to add photo to zip:', photo.id, err.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Bulk download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Download failed' });
    }
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

    const result = await query(
      `SELECT p.public_id, p.image_url, p.file_name, p.is_deleted,
              g.owner_id, g.visibility,
              g.watermark_enabled, g.watermark_text, g.watermark_logo_public_id,
              g.watermark_position, g.watermark_opacity
       FROM photos p
       JOIN galleries g ON g.id = p.gallery_id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0 || result.rows[0].is_deleted) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    const row = result.rows[0];
    if (row.visibility === 'private' && (!req.user || req.user.id !== row.owner_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await query('UPDATE photos SET downloads = downloads + 1 WHERE id = $1', [id]);

    const downloadUrl =
  getWatermarkedUrl(row.public_id, row, { attachment: row.file_name }) || row.image_url;

    res.json({
      success: true,
      data: {
        url: downloadUrl,
        file_name: row.file_name,
        watermarked: !!row.watermark_enabled,
      },
    });
  } catch (error) {
    console.error('Track download error:', error);
    res.status(500).json({ success: false, message: 'Download failed' });
  }
};

module.exports = {
  uploadPhotos,
  getGalleryPhotos,
  getPhoto,
  deletePhoto,
  bulkDelete,
  purgePhotos,
  restorePhotos,
  bulkDownload,
  toggleFavorite,
  getFavorites,
  trackDownload,
};
