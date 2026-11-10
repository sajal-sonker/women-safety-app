CREATE TABLE contact_invitations(id uuid PRIMARY KEY, contact_id uuid NOT NULL REFERENCES emergency_contacts(id), token_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'PENDING', accepted_principal_id uuid REFERENCES app_users(id), consent_version text, decided_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX invitation_expiry ON contact_invitations(expires_at);
CREATE TABLE contact_blocks(phone_hash text NOT NULL, owner_user_id uuid NOT NULL REFERENCES app_users(id), created_at timestamptz DEFAULT now(), PRIMARY KEY(phone_hash,owner_user_id));
CREATE TABLE contact_location_sessions(id uuid PRIMARY KEY, contact_id uuid NOT NULL REFERENCES emergency_contacts(id), principal_id uuid NOT NULL REFERENCES app_users(id), consent_version text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz, location jsonb, sample_id uuid, location_at timestamptz);
CREATE INDEX contact_location_expiry ON contact_location_sessions(expires_at);
CREATE TABLE browser_sessions(id uuid PRIMARY KEY, principal_id uuid REFERENCES app_users(id), grant_id uuid, session_hash text UNIQUE NOT NULL, csrf_hash text NOT NULL, idle_expires_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz);
CREATE INDEX browser_session_expiry ON browser_sessions(expires_at);
