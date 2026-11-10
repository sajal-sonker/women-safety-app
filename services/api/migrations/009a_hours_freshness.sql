ALTER TABLE safe_shops ADD COLUMN hours_reviewed_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX history_owner_time ON sos_events(user_id,created_at DESC,id DESC);
CREATE INDEX journeys_owner_time ON journeys(user_id,started_at DESC,id DESC);
CREATE INDEX contacts_owner_time ON emergency_contacts(owner_user_id,created_at DESC,id DESC);
