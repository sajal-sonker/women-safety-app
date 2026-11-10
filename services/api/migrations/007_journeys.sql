CREATE TABLE journeys(
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id), origin jsonb, destination jsonb NOT NULL, selected_route_id uuid,
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ARRIVED','OVERDUE','ESCALATED','CANCELLED')),
 started_at timestamptz NOT NULL DEFAULT now(), expected_arrival_at timestamptz NOT NULL, checkin_due_at timestamptz NOT NULL, escalate_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 auto_escalate boolean NOT NULL, share_with_contacts boolean NOT NULL, contact_ids uuid[] NOT NULL DEFAULT '{}', deadline_version integer NOT NULL DEFAULT 1, linked_sos_id uuid UNIQUE REFERENCES sos_events(id),
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, escalation_client_id uuid NOT NULL
);
CREATE UNIQUE INDEX one_active_journey ON journeys(user_id) WHERE status IN ('ACTIVE','OVERDUE');
CREATE INDEX journey_deadline ON journeys(status,escalate_at);
ALTER TABLE tracking_grants ADD CONSTRAINT grant_journey_fk FOREIGN KEY(journey_id) REFERENCES journeys(id);
CREATE TABLE journey_checkins(id uuid PRIMARY KEY, journey_id uuid NOT NULL REFERENCES journeys(id), kind text NOT NULL, sent_at timestamptz DEFAULT now(), response_at timestamptz, status text NOT NULL);
CREATE TABLE journey_locations(id uuid PRIMARY KEY, journey_id uuid NOT NULL REFERENCES journeys(id), sample_id uuid NOT NULL, location jsonb NOT NULL, observed_at timestamptz NOT NULL, received_at timestamptz DEFAULT now(), UNIQUE(journey_id,sample_id));
CREATE TABLE journey_recipients(journey_id uuid NOT NULL REFERENCES journeys(id), contact_id uuid NOT NULL REFERENCES emergency_contacts(id), PRIMARY KEY(journey_id,contact_id));
