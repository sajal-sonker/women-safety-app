CREATE TABLE sos_recipients(
 id uuid PRIMARY KEY, sos_event_id uuid NOT NULL REFERENCES sos_events(id), contact_id uuid NOT NULL REFERENCES emergency_contacts(id),
 priority_rank integer NOT NULL, role text NOT NULL CHECK(role IN ('PRIMARY','ALTERNATE')),
 acknowledgement text NOT NULL DEFAULT 'PENDING' CHECK(acknowledgement IN ('PENDING','CAN_ASSIST','CANNOT_ASSIST')),
 acknowledged_at timestamptz, eta_minutes integer CHECK(eta_minutes BETWEEN 0 AND 240),
 consent_version text NOT NULL, promoted boolean NOT NULL DEFAULT false, UNIQUE(sos_event_id,contact_id)
);
CREATE TABLE recipient_acknowledgements(id uuid PRIMARY KEY, recipient_id uuid NOT NULL REFERENCES sos_recipients(id), answer text NOT NULL, eta_minutes integer, created_at timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL);
CREATE TABLE delivery_intents(id uuid PRIMARY KEY, event_id uuid REFERENCES sos_events(id), recipient_id uuid REFERENCES sos_recipients(id), channel text NOT NULL CHECK(channel IN ('SMS','PUSH')), purpose text NOT NULL, sequence integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('PENDING','QUEUED','PROVIDER_ACCEPTED','DELIVERED','FAILED','UNKNOWN','SUPPRESSED')), logical_key text UNIQUE NOT NULL, last_attempt_at timestamptz);
CREATE TABLE notification_outbox(id uuid PRIMARY KEY, intent_id uuid UNIQUE REFERENCES delivery_intents(id), material_ciphertext text, status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','LEASED','RETRY','COMPLETED','DEAD','SUPPRESSED')), attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_owner uuid, lease_expires_at timestamptz, deadline timestamptz NOT NULL, last_error text);
CREATE INDEX outbox_ready ON notification_outbox(status,next_attempt_at);
CREATE INDEX outbox_lease ON notification_outbox(lease_expires_at);
CREATE TABLE fake_messages(id uuid PRIMARY KEY, outbox_id uuid UNIQUE NOT NULL REFERENCES notification_outbox(id), material_ciphertext text NOT NULL, created_at timestamptz DEFAULT now(), expires_at timestamptz NOT NULL);
