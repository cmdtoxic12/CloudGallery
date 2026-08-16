const express = require('express');
const router = express.Router();
const {
  createGallery,
  getMyGalleries,
  getGalleryBySlug,
  getGalleryById,
  updateGallery,
  deleteGallery,
  getDashboardStats,
  trackShare,
} = require('../controllers/gallery.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/stats', authenticate, getDashboardStats);
router.get('/', authenticate, getMyGalleries);
router.post('/', authenticate, createGallery);
router.get('/slug/:slug', optionalAuth, getGalleryBySlug);
router.post('/slug/:slug/unlock', optionalAuth, getGalleryBySlug);
router.get('/:id', authenticate, getGalleryById);
router.put('/:id', authenticate, updateGallery);
router.delete('/:id', authenticate, deleteGallery);
router.post('/:id/share', optionalAuth, trackShare);

module.exports = router;
