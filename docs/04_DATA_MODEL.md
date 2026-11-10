# 04 — Relational/geospatial data model

This is the **logical schema across four phases**, not one oversized first migration. B owns SQL at planned path `services/api/migrations/`; migration batches are below. Generate migrations/tests from this document and [integration invariants](INTEGRATION_CONTRACTS.md), not independent designs. Use UUID PK, UTC `timestamptz`, PostGIS SRID4326, E.164 and partial active indexes.

## Core entities

| Table | Essential columns | Important constraints / indexes |
|---|---|---|
| `app_users` | `id`, `auth_uid UNIQUE`, `phone_e164`, `display_name`, `locale`, `created_at`, `deleted_at` | never return another user's phone unscoped |
| `emergency_contacts` | `id`, `owner_user_id FK`, `display_name`, `phone_e164`, `priority`, `invite_status`, `created_at`, `revoked_at` | unique active `(owner_user_id,phone_e164)`; max 5 enforced in transaction |
| `contact_location_sessions` | `id`, `contact_id`, `consent_at`, `expires_at`, `revoked_at`, `location`, `location_at`, `accuracy_m` | contact-owned consent and scoped token; TTL purge; rank only fresh sessions |
| `sos_events` | `id`, `user_id`, `trigger_type`, `status`, `started_at`, `ended_at`, `initial_location`, `initial_accuracy_m`, `initial_location_at`, `client_request_id`, `score_version NULL` | unique `(user_id,client_request_id)`; status CHECK |
| `sos_locations` | `id`, `sos_event_id`, `position`, `accuracy_m`, `observed_at`, `received_at`, `source` | GiST position; `(sos_event_id,observed_at DESC)`; bounded retention |
| `sos_recipients` | `id`, `sos_event_id`, `contact_id`, `priority_rank`, `alert_tier`, `status`, `acknowledged_at`, `last_attempt_at` | unique `(sos_event_id,contact_id)` |
| `notification_outbox` | `id`, `event_type`, `aggregate_id`, `recipient_id`, `channel`, `payload_version`, `payload_ciphertext_or_ref`, `status`, `attempts`, `next_attempt_at`, `provider_ref` | durable retry; unique logical idempotency key |
| `tracking_grants` | `id`, `sos_event_id`, `recipient_id`, `token_hash`, `scope`, `created_at`, `expires_at`, `revoked_at` | only hash stored; no raw URL in logs; revoke on resolve |
| `evidence_assets` | `id`, `sos_event_id`, `kind`, `object_key`, `size_bytes`, `captured_at`, `status`, `consent_version`, `delete_after` | private storage; no public object URL |
| `journeys` | `id`, `user_id`, `origin`, `destination`, `selected_route_id`, `started_at`, `expected_arrival_at`, `checkin_due_at`, `status`, `completed_at` | unique active journey per user by policy; time index for overdue worker |
| `journey_checkins` | `id`, `journey_id`, `kind`, `sent_at`, `response_at`, `status` | prevents duplicate overdue escalations |

## Routing, reporting and shops

| Table | Essential columns | Rules |
|---|---|---|
| `road_segments` | `id`, `source_osm_ref`, `geom LINESTRING`, `length_m`, `walk_access`, `lit_tag`, `data_version` | spatial index and import provenance |
| `segment_factors` | `segment_id`, `time_bucket`, `feature_version`, `lighting_risk`, `isolation_risk`, `incident_risk`, `shop_gap_risk`, `help_gap_risk`, `road_risk`, `confidence`, `evaluated_at` | nullable factor means unknown, not zero risk |
| `route_evaluations` | `id`, `user_id NULL`, `origin`, `destination`, `depart_at`, `profile`, `score_version`, `computed_at` | only retain personal route queries briefly by policy |
| `route_candidates` | `id`, `evaluation_id`, `provider_route_id`, `geom`, `eta_seconds`, `length_m`, `risk_indicator`, `confidence`, `reason_codes`, `rank` | routes do not assert crime probability |
| `incident_reports` | `id`, `reporter_user_id`, `category`, `position`, `description_sanitized`, `happened_at`, `created_at`, `moderation_status`, `expires_at` | throttle; redact PII; no exact reporter identity public |
| `incident_moderation` | `id`, `report_id`, `moderator_id`, `action`, `reason`, `created_at` | append-only decisions |
| `safe_shops` | `id`, `name`, `position`, `public_phone`, `hours_json`, `status`, `verification_level`, `owner_user_id`, `opt_in_alerts`, `verified_at`, `last_confirmed_open_at` | 'open' is schedule-derived unless live confirmed; owner may pause |
| `shop_audit` | `id`, `shop_id`, `actor_id`, `action`, `reason`, `created_at` | audit verification/edit/removal |
| `device_sessions` | `id`, `user_id`, `fcm_token_ciphertext`, `platform`, `last_seen_at`, `revoked_at` | rotate/purge; no client token in logs |
| `audit_events` | `id`, `actor_type`, `actor_id`, `action`, `resource_type`, `resource_id`, `created_at`, `request_id` | redact coordinates/token/media content |

## Enums (shared between backend and mobile)

```text
SOS status: CREATED | DISPATCHING | ACTIVE | RESOLVED | CANCELLED
SOS trigger: MANUAL | JOURNEY_OVERDUE | DURESS_PIN | VOLUME_CODE | SHAKE | ML_FUSION
Channel delivery: PENDING | QUEUED | PROVIDER_ACCEPTED | DELIVERED | FAILED | UNKNOWN | SUPPRESSED
Recipient acknowledgement: PENDING | CAN_ASSIST | CANNOT_ASSIST
Invite status: PENDING | VERIFIED | DECLINED | REVOKED
Journey status: ACTIVE | ARRIVED | OVERDUE | ESCALATED | CANCELLED
Report status: PENDING | APPROVED | REJECTED | WITHDRAWN
Shop status: PENDING | ACTIVE | PAUSED | REVOKED
Evidence status: REQUESTED | UPLOADING | QUARANTINED | AVAILABLE | FAILED | DELETED
```

`DELIVERED` only when provider confirms delivery; a provider accepting a request is `PROVIDER_ACCEPTED`, not proof it arrived. SMS delivery receipt may be unavailable.

## Permissions and relationship rules

- Owner reads own event history; recipient reads **only** the event covered by an active grant, never arbitrary event IDs.
- A contact being named in `emergency_contacts` does not imply location-sharing permission. `contact_location_sessions` must be independently initiated and revocable.
- Admins may approve reports/shops but cannot access private SOS/media without separate tightly audited support procedures.
- User can delete account and request erasure of own records subject to documented necessary retention, provider constraints and audit minimalism.
- Hard deletes for expired GPS trace and media; indexes optimized for expiry and user ownership; prohibit cascading deletions that leave active dispatch orphaned.

## Schema/testing gates

Foreign key tests; duplicate client request id race; two simultaneous SOS creations; unique active contact cap; spatial nearest-query correctness; active grant revocation; cleanup job tests; moderation permission tests; migrations reversible in staging.

## Review-1.1 persistence closure and migration ownership

The compact original tables describe essential fields, not permission to omit the fields below. Logical references to recipient `status` now mean independent acknowledgement and child channel statuses, not a combined enum. All mutable aggregates have revision/update timestamps; every FK has deliberate delete behavior, never blind cascading active dispatch. No client may choose schema ownership.

| Batch / phase | Additions or changed constraints | Verification |
|---|---|---|
| 001 / P1 | PostGIS; app_users with auth UID and deletion/disabled flags; `role_assignments(user_id,role,assigned_by,created_at)`; `user_consents(user_id,purpose,version,granted_at,revoked_at)`; device_sessions with unique active installation/token hashes, encrypted tokens; contacts plus verified principal FK and consent version | extension exists, auth UID uniqueness, role injection denied, concurrent cap under locked owner, no sensitive logs |
| 002 / P1 | `contact_invitations(id,contact_id,token_hash,expires_at,status,accepted_principal_id,consent_version,decided_at,encrypted_delivery_ref)`; `contact_blocks(principal_id,owner_user_id,created_at)`; contact_location_sessions includes principal FK/consent version; `browser_sessions(id,principal_id?,grant_id?,session_hash,csrf_hash,idle_expires_at,expires_at,revoked_at)` | matching phone, one decision, revoked invite/session denial, blocked resend, GPS erased on end |
| 003 / P1 | SOS event includes triggered_at, expires_at, resolution, policy_version, revision, immutable request_hash, latest_position_ref; `sos_intents(user_id,client_request_id,request_hash?,state,event_id?,terminated_at?,expires_at)` UNIQUE(user,key), lock identity before event create/terminate | atomic commit/rollback, 5-way replay, mismatch409, late create loses to tombstone |
| 004 / P1 | sos_recipients includes consent snapshot, role/rank, independent ack; `recipient_acknowledgements(id,recipient_id,answer,eta_minutes,created_at,revision)` append-only; `delivery_intents(id,event_id,recipient_id,channel,purpose,sequence,status,logical_key UNIQUE)`; outbox keyed to intent with lease_owner,lease_expires_at,next_attempt_at,encrypted material,deadline,last_error,attempt count | one intent per logical send; lease expiry recovery; no ACK overwritten by receipt; resolve suppression |
| 005 / P1 | `delivery_attempts(id,intent_id,attempt_no,provider,idempotency_ref,started_at,finished_at,outcome,provider_message_ref,error_class)` UNIQUE(intent,attempt); `provider_receipts(provider,receipt_id UNIQUE,provider_message_ref,status,received_at)`; `scheduled_jobs(id,kind,aggregate_id,due_at,version,status,lease_owner,lease_expires_at,dedupe_key UNIQUE)`; `domain_events(aggregate_id,revision,type,occurred_at,payload_redacted)` UNIQUE(aggregate,revision) | crash-after-send UNKNOWN, duplicate/out-of-order signed receipts, redaction, timers survive restart |
| 006 / P1 | tracking_grants add kind SOS_READ/JOURNEY_READ/SHOP_ALERT, explicit scopes, token hash unique; separate recipient/session ownership; location sample_id UNIQUE(event,sample), capture+receive timestamps; audit_events; general `idempotency_records(principal,operation,resource,key,request_hash,response_ref,expires_at)`; shared limiter counters keyed by hash | terminal/revoked grant checked per read; duplicate sample, cross-user IDOR, expiry/purge |
| 007 / P2 | journeys/checkins plus auto_escalate, sharing consent, expires_at, deadline_version, escalate_at, linked_sos_id UNIQUE, escalation_version; `journey_locations` same sample/freshness constraints; `journey_recipients` and journey-scoped grants | partial unique index on user where status ACTIVE/OVERDUE; arrival/extension/escalation row-lock race; one source SOS |
| 008 / P2 | road_segments, factors, evaluations/candidates; `data_imports(id,source_url,license,acquired_at,boundary,checksum,version,coverage)`; factors carry quality/source refs/valid_until, PK(segment,time_bucket,feature_version); route geometry LINESTRING4326; evaluation expiry | GiST and walking correctness, lon/lat conversion, unknown/expired values, import idempotence |
| 009 / P2 | reports/moderation plus aggregated cells/corroboration and expiry; shops plus listing consent, owner verification notes, timezone/structured hours, confirmation/closure expiry; shop_audit | exact reports never public, revoked shops excluded, rejected maps REVOKED, moderator cannot read SOS |
| 010 / P3 | evidence_assets add sha256,mime,duration,quarantine/scan flags,consent FK; `evidence_recipient_scopes(asset_id,recipient_id)`; `evidence_access_audit` minimal metadata; `shop_alerts(event_id,shop_id,user_consent_version,agreement_version,expires_at,status)` unique per event/shop; separate shop grant/session | AVAILABLE only after checks, no evidence scope to shops/moderators, upload/delete race |
| 011 / P4 | `privacy_jobs(id,user_id,kind:EXPORT|DELETE,status,requested_at,expires_at,artifact_ref?,error_class?)`; deletion/purge cursor state; policy/backup manifest refs | deterministic deletion/export ownership, restore re-purges erased data, export expiry |

Migration numbers are reserved order, not claims of existing SQL. B may split a batch with suffixes before G0 only; record actual IDs in contract lock. Phases never renumber applied migrations. Add indexes on jobs/outbox `(status,next_attempt_at)` or `(status,due_at)`, lease expiry, grant/session expiry, retention columns, and FK lookups. Add CHECKs for finite/ranged coordinates, battery/accuracy, state values, nonnegative durations, and consent/expiry order. Application transactions enforce cross-row contact caps and intent locks; a row-count check outside lock is insufficient. Use `ON DELETE RESTRICT` for live aggregates; explicit erasure procedure terminalizes then purges children.

Point geography uses metres; road geometry uses `geometry(LineString,4326)` and projected/geography distances. OSM IDs are not stable application PKs; graph import version disambiguates edge IDs. Maintain geometry index and provenance mapping; no reuse of edge ID across imports without version.

Retention uses deletion jobs and indexes per [security](11_SECURITY_PRIVACY.md) and review defaults. Hard-delete detailed GPS/media at expiry, including initial position and duplicated context references; retaining initial coordinate in event summary would defeat trace purge. Summary after trace purge contains event time/type/status only. Idempotency/tombstone summary is minimized and purged with event retention. Backup retention30d and restore-time deletion ledger reconciliation are required; providers' residual copies need separate published handling. SQL migrations use expand/contract; rollback deploys previous compatible application, never destructive down-migration over live emergency data.

Review-1.2 additions within the reserved unimplemented batches:002 browser_sessions gains grant selector, exchange_id hash, exchange retry expiry and encrypted pending-cookie material purged after120s; consent reactivation audit restores future permission only.007 owner/status journey lookup index supports process-death recovery.009 shops gains availability_override/state/expiry and confirmation_expires_at. Route queries/evaluations purge origin/destination/geometry after24h; retain only nonpersonal version/performance aggregates. If journey.selected_route_id still references evaluation, null the optional reference or retain a nonspatial minimal parent until journey terminal, never retain coordinates implicitly for FK convenience.

Mobile session registry/journal is device-only storage, not another server schema. Full event expiry is24h hard limit; grant renewal never extends it. Exact nested wire objects and lookup routes are defined in05/integration section11; add SQL CHECKs/indexes and negative tests for every applicable field before G0.
