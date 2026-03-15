-- V5: Report Settings for Automated Reports
-- Stores admin-configurable settings for daily/weekly report emails

CREATE TABLE IF NOT EXISTS report_settings (
  id text PRIMARY KEY DEFAULT 'default',
  daily_enabled boolean NOT NULL DEFAULT true,
  weekly_enabled boolean NOT NULL DEFAULT false,
  daily_send_hour integer NOT NULL DEFAULT 18, -- 0-23, in PST
  daily_send_minute integer NOT NULL DEFAULT 0, -- 0-59
  recipients jsonb NOT NULL DEFAULT '["jay@aftmodeling.com"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default row
INSERT INTO report_settings (id, daily_enabled, weekly_enabled, daily_send_hour, daily_send_minute, recipients)
VALUES ('default', true, false, 18, 0, '["jay@aftmodeling.com"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE report_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read settings
CREATE POLICY "Admins can read report settings"
  ON report_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update settings
CREATE POLICY "Admins can update report settings"
  ON report_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can read (for cron)
CREATE POLICY "Service role can read report settings"
  ON report_settings FOR SELECT
  USING (true);
