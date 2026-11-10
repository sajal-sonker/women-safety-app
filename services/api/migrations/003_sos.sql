CREATE TABLE sos_events(
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id), client_request_id uuid NOT NULL, request_hash text NOT NULL,
 trigger_type text NOT NULL CHECK(trigger_type IN ('MANUAL','JOURNEY_OVERDUE','DURESS_PIN','VOLUME_CODE','SHAKE','ML_FUSION')),
 status text NOT NULL CHECK(status IN ('CREATED','DISPATCHING','ACTIVE','RESOLVED','CANCELLED')),
 triggered_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, ended_at timestamptz, resolution text CHECK(resolution IN ('SAFE','FALSE_ALARM','EXPIRED')),
 position jsonb, initial_location_at timestamptz, context jsonb NOT NULL DEFAULT '{}', policy_version text NOT NULL DEFAULT 'sos-v1',
 revision integer NOT NULL DEFAULT 1, UNIQUE(user_id,client_request_id)
);
CREATE INDEX event_expiry ON sos_events(expires_at) WHERE ended_at IS NULL;
CREATE TABLE sos_intents(user_id uuid NOT NULL REFERENCES app_users(id), client_request_id uuid NOT NULL, request_hash text, state text NOT NULL CHECK(state IN ('ACCEPTED','TERMINATED')), event_id uuid REFERENCES sos_events(id), expires_at timestamptz NOT NULL, terminated_at timestamptz, PRIMARY KEY(user_id,client_request_id));
CREATE TABLE sos_locations(
 id uuid PRIMARY KEY, sos_event_id uuid NOT NULL REFERENCES sos_events(id), sample_id uuid NOT NULL, location jsonb NOT NULL,
 observed_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 position geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint((location->>'lon')::double precision,(location->>'lat')::double precision),4326)::geography) STORED,
 UNIQUE(sos_event_id,sample_id)
);
CREATE INDEX sos_location_spatial ON sos_locations USING gist(position);
CREATE INDEX sos_location_time ON sos_locations(sos_event_id,received_at,id);
