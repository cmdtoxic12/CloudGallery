-- CloudGallery: persistent public-registration switch
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Preserve the current public-registration behavior on first installation.
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('registration_open', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
