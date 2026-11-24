const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/photo.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

router.post(
  '/upload',
  authenticate,
  upload.array('photos', 20),
  handleUploadError,
  uploadPhotos
);

router.get('/favorites', authenticate, getFavorites);
router.post('/bulk-delete', authenticate, bulkDelete);
router.post('/purge', authenticate, purgePhotos);
router.post('/restore', authenticate, restorePhotos);
router.post('/bulk-download', optionalAuth, bulkDownload);
router.get('/gallery/:galleryId', optionalAuth, getGalleryPhotos);
router.get('/:id', optionalAuth, getPhoto);
router.delete('/:id', authenticate, deletePhoto);
router.post('/:id/favorite', authenticate, toggleFavorite);
router.post('/:id/download', optionalAuth, trackDownload);

module.exports = router;
