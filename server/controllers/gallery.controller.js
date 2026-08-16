const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const generateSlug = (name) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 40);
  const shortId = uuidv4().split('-')[0];
  return `${base}-${shortId}`;
};

const createGallery = async (req, res) => {
  try {
    const { name, description, location, event_date, visibility, password } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Gallery name is required (min 2 characters)' });
    }

    const vis = ['public', 'private', 'password'].includes(visibility) ? visibility : 'public';
    let passwordHash = null;

    if (vis === 'password') {
      if (!password || password.length < 4) {
        return res.status(400).json({ success: false, message: 'Password required (min 4 characters) for password-protected galleries' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const slug = generateSlug(name);

    const result = await query(
      `INSERT INTO galleries (owner_id, name, description, location, event_date, slug, visibility, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, description, location, event_date, cover_photo_url, slug, visibility, views, created_at`,
      [
        req.user.id,
        name.trim(),
        description || null,
        location || null,
        event_date || null,
        slug,
        vis,
        passwordHash,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Gallery created successfully',
      data: { gallery: result.rows[0] },
    });
  } catch (error) {
    console.error('Create gallery error:', error);
    res.status(500).json({ success: false, message: 'Failed to create gallery' });
  }
};

const getMyGalleries = async (req, res) => {
  try {
    const result = await query(
      `SELECT g.*,
              (SELECT COUNT(*)::int FROM photos p WHERE p.gallery_id = g.id AND p.is_deleted = FALSE) AS photo_count
       FROM galleries g
       WHERE g.owner_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: { galleries: result.rows } });
  } catch (error) {
    console.error('Get galleries error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch galleries' });
  }
};

const getGalleryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { password } = req.body || {};

    const result = await query(
      `SELECT g.*, u.name AS owner_name,
              (SELECT COUNT(*)::int FROM photos p WHERE p.gallery_id = g.id AND p.is_deleted = FALSE) AS photo_count
       FROM galleries g
       JOIN users u ON u.id = g.owner_id
       WHERE g.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }

    const gallery = result.rows[0];

    // Access control
    if (gallery.visibility === 'private') {
      if (!req.user || req.user.id !== gallery.owner_id) {
        return res.status(403).json({ success: false, message: 'This gallery is private' });
      }
    }

    if (gallery.visibility === 'password') {
      const isOwner = req.user && req.user.id === gallery.owner_id;
      if (!isOwner) {
        if (!password) {
          return res.status(401).json({
            success: false,
            message: 'Password required',
            requiresPassword: true,
          });
        }
        const match = await bcrypt.compare(password, gallery.password_hash);
        if (!match) {
          return res.status(401).json({ success: false, message: 'Incorrect password' });
        }
      }
    }

    // Increment views (non-owner)
    if (!req.user || req.user.id !== gallery.owner_id) {
      await query('UPDATE galleries SET views = views + 1 WHERE id = $1', [gallery.id]);
      gallery.views += 1;
    }

    // Remove sensitive fields
    delete gallery.password_hash;

    res.json({ success: true, data: { gallery } });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch gallery' });
  }
};

const getGalleryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT g.*,
              (SELECT COUNT(*)::int FROM photos p WHERE p.gallery_id = g.id AND p.is_deleted = FALSE) AS photo_count
       FROM galleries g
       WHERE g.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }

    const gallery = result.rows[0];

    if (gallery.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    delete gallery.password_hash;
    res.json({ success: true, data: { gallery } });
  } catch (error) {
    console.error('Get gallery by id error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch gallery' });
  }
};

const updateGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, event_date, visibility, password, cover_photo_url } = req.body;

    const existing = await query('SELECT * FROM galleries WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }
    if (existing.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let passwordHash = existing.rows[0].password_hash;
    const vis = visibility || existing.rows[0].visibility;

    if (vis === 'password' && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    if (vis !== 'password') {
      passwordHash = null;
    }

    const result = await query(
      `UPDATE galleries SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         location = COALESCE($3, location),
         event_date = COALESCE($4, event_date),
         visibility = COALESCE($5, visibility),
         password_hash = $6,
         cover_photo_url = COALESCE($7, cover_photo_url)
       WHERE id = $8
       RETURNING id, name, description, location, event_date, cover_photo_url, slug, visibility, views, created_at, updated_at`,
      [
        name || null,
        description !== undefined ? description : null,
        location !== undefined ? location : null,
        event_date || null,
        visibility || null,
        passwordHash,
        cover_photo_url || null,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Gallery updated',
      data: { gallery: result.rows[0] },
    });
  } catch (error) {
    console.error('Update gallery error:', error);
    res.status(500).json({ success: false, message: 'Failed to update gallery' });
  }
};

const deleteGallery = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT owner_id FROM galleries WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gallery not found' });
    }
    if (existing.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Soft-delete photos first is handled by CASCADE, but we can hard delete gallery
    await query('DELETE FROM galleries WHERE id = $1', [id]);

    res.json({ success: true, message: 'Gallery deleted successfully' });
  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete gallery' });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [galleries, photos, views, storage] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM galleries WHERE owner_id = $1', [userId]),
      query(
        `SELECT COUNT(*)::int AS count FROM photos p
         JOIN galleries g ON g.id = p.gallery_id
         WHERE g.owner_id = $1 AND p.is_deleted = FALSE`,
        [userId]
      ),
      query('SELECT COALESCE(SUM(views), 0)::int AS total FROM galleries WHERE owner_id = $1', [userId]),
      query('SELECT storage_used FROM users WHERE id = $1', [userId]),
    ]);

    res.json({
      success: true,
      data: {
        totalGalleries: galleries.rows[0].count,
        totalPhotos: photos.rows[0].count,
        totalViews: views.rows[0].total,
        storageUsed: parseInt(storage.rows[0].storage_used) || 0,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

const trackShare = async (req, res) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;

    await query(
      'INSERT INTO shares (gallery_id, user_id, platform) VALUES ($1, $2, $3)',
      [id, req.user?.id || null, platform || 'link']
    );

    res.json({ success: true, message: 'Share tracked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to track share' });
  }
};

module.exports = {
  createGallery,
  getMyGalleries,
  getGalleryBySlug,
  getGalleryById,
  updateGallery,
  deleteGallery,
  getDashboardStats,
  trackShare,
};
