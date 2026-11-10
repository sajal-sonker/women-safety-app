ALTER TABLE browser_sessions ADD COLUMN auth_time timestamptz;
CREATE TABLE privacy_jobs(
 id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES app_users(id),kind text NOT NULL CHECK(kind IN ('EXPORT','DELETE')),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PROCESSING','COMPLETED','FAILED','EXPIRED')),
 requested_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz,artifact_ciphertext text,error_class text,completed_at timestamptz
);
CREATE UNIQUE INDEX privacy_pending ON privacy_jobs(user_id,kind) WHERE status IN ('PENDING','PROCESSING');
CREATE INDEX privacy_expiry ON privacy_jobs(expires_at);
CREATE TABLE deletion_ledger(auth_uid_hash text PRIMARY KEY,deleted_at timestamptz NOT NULL DEFAULT now(),backup_expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days');
