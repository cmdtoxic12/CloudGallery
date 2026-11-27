-- Gallery watermark / logo settings (safe to re-run)

ALTER TABLE galleries ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS watermark_text VARCHAR(200);
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS watermark_logo_url TEXT;
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS watermark_logo_public_id VARCHAR(255);
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS watermark_position VARCHAR(30) DEFAULT 'south_east';
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS watermark_opacity INTEGER DEFAULT 50;
