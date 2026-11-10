CREATE TABLE tracking_grants(
 id uuid PRIMARY KEY, sos_event_id uuid REFERENCES sos_events(id), journey_id uuid, recipient_id uuid REFERENCES sos_recipients(id), contact_id uuid NOT NULL REFERENCES emergency_contacts(id),
 kind text NOT NULL CHECK(kind IN ('SOS_READ','JOURNEY_READ','SHOP_ALERT')), token_hash text UNIQUE NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz,
 exchange_hash text, exchange_until timestamptz, recovery_ciphertext text
);
ALTER TABLE browser_sessions ADD CONSTRAINT browser_grant_fk FOREIGN KEY(grant_id) REFERENCES tracking_grants(id);
CREATE INDEX grant_expiry ON tracking_grants(expires_at);
CREATE TABLE idempotency_records(principal uuid NOT NULL REFERENCES app_users(id), operation text NOT NULL, key uuid NOT NULL, request_hash text NOT NULL, result jsonb NOT NULL, expires_at timestamptz NOT NULL, PRIMARY KEY(principal,operation,key));
CREATE TABLE limiter_counters(key text NOT NULL, bucket bigint NOT NULL, count integer NOT NULL, expires_at timestamptz NOT NULL, PRIMARY KEY(key,bucket));
CREATE TABLE audit_events(id uuid PRIMARY KEY, actor_id uuid REFERENCES app_users(id), action text NOT NULL, resource_type text NOT NULL, resource_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), request_id uuid);
CREATE INDEX audit_expiry ON audit_events(created_at);
