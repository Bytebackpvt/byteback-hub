
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start smallint NOT NULL DEFAULT 22 CHECK (quiet_hours_start >= 0 AND quiet_hours_start <= 23),
  ADD COLUMN IF NOT EXISTS quiet_hours_end smallint NOT NULL DEFAULT 7 CHECK (quiet_hours_end >= 0 AND quiet_hours_end <= 23),
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';
