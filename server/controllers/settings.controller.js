const { query } = require('../config/database');

const isAdmin = (req) => {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  return Boolean(adminEmail && req.user?.email?.toLowerCase() === adminEmail);
};

const getRegistrationStatus = async (_req, res) => {
  try {
    const result = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'registration_open' LIMIT 1`
    );
    const value = result.rows[0]?.setting_value;
    const registrationOpen = value === undefined ? true : value === true || value === 'true';
    res.json({ success: true, data: { registrationOpen } });
  } catch (error) {
    console.error('Get registration status error:', error);
    res.status(500).json({ success: false, message: 'Could not load registration settings' });
  }
};

const getAdminSettings = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Administrator access required' });
    }
    const result = await query(
      `SELECT setting_value FROM app_settings WHERE setting_key = 'registration_open' LIMIT 1`
    );
    const value = result.rows[0]?.setting_value;
    const registrationOpen = value === undefined ? true : value === true || value === 'true';
    res.json({ success: true, data: { registrationOpen, isAdmin: true } });
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({ success: false, message: 'Could not load admin settings' });
  }
};

const updateRegistrationStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Administrator access required' });
    }
    if (typeof req.body.registrationOpen !== 'boolean') {
      return res.status(400).json({ success: false, message: 'registrationOpen must be true or false' });
    }

    const result = await query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES ('registration_open', $1::jsonb, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
       RETURNING setting_value`,
      [JSON.stringify(req.body.registrationOpen)]
    );

    res.json({
      success: true,
      message: req.body.registrationOpen ? 'Public registration is now open' : 'Public registration is now closed',
      data: { registrationOpen: result.rows[0].setting_value === true },
    });
  } catch (error) {
    console.error('Update registration status error:', error);
    res.status(500).json({ success: false, message: 'Could not update registration settings' });
  }
};

module.exports = { getRegistrationStatus, getAdminSettings, updateRegistrationStatus };
