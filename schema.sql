CREATE TABLE IF NOT EXISTS whale_events (
  id SERIAL PRIMARY KEY,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  count INTEGER NOT NULL,
  message_ts TEXT NOT NULL,
  channel TEXT NOT NULL,
  event_date DATE NOT NULL,       -- KST date
  event_month TEXT NOT NULL,      -- KST month, YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_ts, recipient)
);

CREATE INDEX IF NOT EXISTS idx_whale_sender_date ON whale_events (sender, event_date);
CREATE INDEX IF NOT EXISTS idx_whale_month ON whale_events (event_month);
CREATE INDEX IF NOT EXISTS idx_whale_recipient_month ON whale_events (recipient, event_month);

-- Cached Slack display name / avatar per user, so the dashboard doesn't hit
-- the Slack API on every load. Refreshed when older than 1 day (see lib/users.ts).
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
