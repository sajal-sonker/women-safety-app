CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE app_users (
 id uuid PRIMARY KEY, auth_uid text UNIQUE NOT NULL, phone_e164 text NOT NULL CHECK(phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 display_name text NOT NULL DEFAULT '', locale text NOT NULL DEFAULT 'en' CHECK(locale IN ('en','hi')),
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 disabled boolean NOT NULL DEFAULT false, deleted_at timestamptz,
 consents jsonb NOT NULL DEFAULT '{"version":"consent-v1","monitoring":false,"evidence":false,"shop_alerts":false}'
);
CREATE TABLE role_assignments(user_id uuid REFERENCES app_users(id), role text CHECK(role IN ('USER','SHOP_OWNER','MODERATOR')), assigned_by text NOT NULL, created_at timestamptz DEFAULT now(), PRIMARY KEY(user_id,role));
CREATE TABLE user_consents(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id), purpose text NOT NULL, version text NOT NULL, granted_at timestamptz, revoked_at timestamptz);
CREATE TABLE emergency_contacts(
 id uuid PRIMARY KEY, owner_user_id uuid NOT NULL REFERENCES app_users(id), principal_id uuid REFERENCES app_users(id),
 name text NOT NULL, phone_e164 text NOT NULL, priority integer NOT NULL CHECK(priority BETWEEN 1 AND 5),
 invite_status text NOT NULL DEFAULT 'PENDING' CHECK(invite_status IN ('PENDING','VERIFIED','DECLINED','REVOKED')),
 consent_at timestamptz, consent_version text, revoked_at timestamptz,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX active_contact_phone ON emergency_contacts(owner_user_id,phone_e164) WHERE revoked_at IS NULL;
CREATE INDEX contact_principal ON emergency_contacts(principal_id);
CREATE TABLE device_sessions(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id), installation_id uuid NOT NULL UNIQUE, token_hash text UNIQUE NOT NULL, token_ciphertext text NOT NULL, notifications_enabled boolean NOT NULL, last_seen_at timestamptz DEFAULT now(), revoked_at timestamptz);
