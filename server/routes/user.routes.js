const express = require('express');
const router = express.Router();
const { updateProfile, changePassword } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');

router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

module.exports = router;
