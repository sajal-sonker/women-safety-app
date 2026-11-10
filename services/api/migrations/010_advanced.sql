CREATE TABLE evidence_assets(
 id uuid PRIMARY KEY, sos_event_id uuid NOT NULL REFERENCES sos_events(id), user_id uuid NOT NULL REFERENCES app_users(id),
 kind text NOT NULL CHECK(kind IN ('AUDIO','PHOTO','VIDEO')), mime text NOT NULL,
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760), sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 duration_s double precision CHECK(duration_s BETWEEN 0 AND 10), captured_at timestamptz NOT NULL,
 consent_version text NOT NULL, status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','UPLOADING','QUARANTINED','AVAILABLE','FAILED','DELETED')),
 upload_expires_at timestamptz NOT NULL, delete_after timestamptz NOT NULL, material_ciphertext text,
 sanitized_ciphertext text, scan_result text, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evidence_retention ON evidence_assets(delete_after);
CREATE INDEX evidence_event ON evidence_assets(sos_event_id);
CREATE TABLE evidence_recipient_scopes(asset_id uuid NOT NULL REFERENCES evidence_assets(id),recipient_id uuid NOT NULL REFERENCES sos_recipients(id),PRIMARY KEY(asset_id,recipient_id));
CREATE TABLE evidence_access_audit(id uuid PRIMARY KEY,asset_id uuid NOT NULL REFERENCES evidence_assets(id),actor_id uuid REFERENCES app_users(id),grant_id uuid REFERENCES tracking_grants(id),action text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE shop_alerts(id uuid PRIMARY KEY,event_id uuid NOT NULL REFERENCES sos_events(id),shop_id uuid NOT NULL REFERENCES safe_shops(id),user_consent_version text NOT NULL,agreement_version text NOT NULL,expires_at timestamptz NOT NULL,status text NOT NULL,UNIQUE(event_id,shop_id));
