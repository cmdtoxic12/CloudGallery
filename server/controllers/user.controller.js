const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const updateProfile = async (req, res) => {
  try {
    const { name, avatar_url } = req.body;

    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3
       RETURNING id, name, email, avatar_url, storage_used, created_at`,
      [name || null, avatar_url || null, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated',
      data: { user: result.rows[0] },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

module.exports = { updateProfile, changePassword };
