CREATE TABLE incident_reports(id uuid PRIMARY KEY, reporter_user_id uuid NOT NULL REFERENCES app_users(id), category text NOT NULL CHECK(category IN ('LIGHTING','HARASSMENT','ROAD_OBSTRUCTION','OTHER_CONDITION')), location jsonb NOT NULL, position geography(Point,4326) NOT NULL, cell_id text NOT NULL, description text, happened_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), moderation_status text NOT NULL DEFAULT 'PENDING' CHECK(moderation_status IN ('PENDING','APPROVED','REJECTED','WITHDRAWN')), moderation_reason text, expires_at timestamptz NOT NULL, revision integer NOT NULL DEFAULT 1);
CREATE INDEX report_spatial ON incident_reports USING gist(position);
CREATE INDEX report_moderation ON incident_reports(moderation_status,expires_at);
CREATE TABLE incident_moderation(id uuid PRIMARY KEY, report_id uuid NOT NULL REFERENCES incident_reports(id), moderator_id uuid NOT NULL REFERENCES app_users(id), action text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE safe_shops(
 id uuid PRIMARY KEY, owner_user_id uuid NOT NULL REFERENCES app_users(id), name text NOT NULL, location jsonb NOT NULL, position geography(Point,4326) NOT NULL,
 public_phone text, hours jsonb NOT NULL, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','PAUSED','REVOKED')),
 verification_level text NOT NULL DEFAULT 'NONE', verified_at timestamptz, verified_by uuid REFERENCES app_users(id), confirmed_at timestamptz, confirmation_expires_at timestamptz, closure_until timestamptz,
 listing_consent_version text NOT NULL, opt_in_alerts boolean NOT NULL DEFAULT false, agreement_version text, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shop_spatial ON safe_shops USING gist(position);
CREATE TABLE shop_audit(id uuid PRIMARY KEY, shop_id uuid NOT NULL REFERENCES safe_shops(id), actor_id uuid NOT NULL REFERENCES app_users(id), action text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
