const express = require('express');
const router = express.Router();
const {
  createGallery,
  getMyGalleries,
  getGalleryBySlug,
  getGalleryById,
  updateGallery,
  uploadWatermarkLogo,
  deleteGallery,
  getDashboardStats,
  trackShare,
} = require('../controllers/gallery.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

router.get('/stats', authenticate, getDashboardStats);
router.get('/', authenticate, getMyGalleries);
router.post('/', authenticate, createGallery);
router.get('/slug/:slug', optionalAuth, getGalleryBySlug);
router.post('/slug/:slug/unlock', optionalAuth, getGalleryBySlug);
router.get('/:id', authenticate, getGalleryById);
router.put('/:id', authenticate, updateGallery);
router.post(
  '/:id/watermark-logo',
  authenticate,
  upload.single('logo'),
  handleUploadError,
  uploadWatermarkLogo
);
router.delete('/:id', authenticate, deleteGallery);
router.post('/:id/share', optionalAuth, trackShare);

module.exports = router;
