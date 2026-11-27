const express = require('express');
const router = express.Router();
const {
  getRegistrationStatus,
  getAdminSettings,
  updateRegistrationStatus,
} = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth');

// Public status is used by the registration page to show the correct state.
router.get('/registration', getRegistrationStatus);
// Admin-only settings endpoints.
router.get('/admin', authenticate, getAdminSettings);
router.put('/registration', authenticate, updateRegistrationStatus);

module.exports = router;
