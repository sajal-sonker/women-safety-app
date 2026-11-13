# 05 — API contracts (v1)

## CR-009: authenticated Android recipient (13 November2026)

**CR-010 update (13 November2026):** `GET /received-alerts` includes required `own_acknowledgement` on every ReceivedAlert: PENDING, CAN_ASSIST or CANNOT_ASSIST for SOS grants; null for journey grants. This comes from the existing recipient record. After a successful ACK, consumers dismiss response controls and keep a saved status; an older pending poll cannot immediately restore the prompt. Reopening details shows the saved response and an explicit Change my response action. Failed POSTs never show success. Current source hash is in [CONTRACT_LOCK.md](../packages/contracts/CONTRACT_LOCK.md). No new table, endpoint or delivery guarantee.

The same account can be an owner and a recipient. All five added operations use Firebase bearer identity and the usual UUID idempotency header for mutations:

| Operation | Request → response |
|---|---|
| POST `/contacts/invitations/{inviteId}/accept` | `AcceptInboxInvite {consent_version:'consent-v1'}` → Contact |
| POST `/contacts/invitations/{inviteId}/decline` | `DeclineInboxInvite {block_future_invites:boolean}` →204 |
| GET `/received-alerts` | ReceivedAlerts: active grant summaries, max100, no secret tokens or positions |
| GET `/received-alerts/{grantId}` | ReceivedAlertDetail: kind plus either TrackingView event or JourneyTracking journey |
| POST `/received-alerts/{grantId}/acknowledge` | Existing Acknowledge → Acknowledged; SOS grants only |

Invitation decisions require the authenticated exact invited phone, pending/unexpired invitation and active contact. Recipient access additionally requires the contact's accepted principal ID, VERIFIED consent and a live grant/event/journey. Wrong identity returns404; expired/revoked sharing returns410. Revalidate before idempotent ACK replay. Uses existing invitation/grant/recipient tables and view/ACK functions; no migration. Existing web token/cookie routes retain their security model. Mobile never calls the local fake-message endpoint or exchanges browser link tokens. Native Contacts polls the existing invitations/consents/own contacts plus recipient summaries while foreground, with account generation guards and no overlapping scheduled polls. Details poll separately and clear positions on failed access. Physical two-phone checks remain separate.

**Base:** `/v1` over HTTPS; authenticated mobile requests carry `Authorization: Bearer <Firebase ID token>`. API validates tokens server-side and maps `auth_uid` to internal UUID. Standard JSON with UTC ISO timestamps. All mutable actions perform ownership checks; do not trust user IDs supplied by app.

**Review-1.2 normative closure:** Read [INTEGRATION_CONTRACTS.md](INTEGRATION_CONTRACTS.md) for exact authentication, state, validation, consent, retry, privacy, native and provider semantics. The catalogue below plus its closure is the schema input for P1-T03; no independent mobile/server types. The SOS example is a complete minimal instance; compact table objects expand through the named schemas. All routes below are relative to `/v1`.

## Shared wire types

```ts
type UUID = string;
type Location = {
  lat: number; lon: number; accuracy_m: number | null;
  captured_at: string; source: 'gps' | 'network' | 'last_known' | 'manual';
};
type ApiError = { error: { code: string; message: string; request_id: string } };
type SosTrigger = 'MANUAL' | 'JOURNEY_OVERDUE' | 'DURESS_PIN' | 'VOLUME_CODE' | 'SHAKE' | 'ML_FUSION';
type SosStatus = 'CREATED' | 'DISPATCHING' | 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
type DeliveryStatus = 'PENDING' | 'QUEUED' | 'PROVIDER_ACCEPTED' | 'DELIVERED' | 'FAILED' | 'UNKNOWN' | 'SUPPRESSED';
type Acknowledgement = 'PENDING' | 'CAN_ASSIST' | 'CANNOT_ASSIST';
```

## Identity / contacts

| Method | Route | Request / response | Security |
|---|---|---|---|
| `GET` | `/me` | profile and consent settings | owner only |
| `PATCH` | `/me` | `{display_name?,locale?}` | validated owner |
| `POST` | `/contacts` | `{name,phone_e164,priority}` → contact object | cap 5, idempotency |
| `GET` | `/contacts` | `[{id,name,priority,invite_status,location_available}]` | hide contact precise GPS |
| `PATCH` | `/contacts/:id` | `{name?,priority?}` | owner only |
| `DELETE` | `/contacts/:id` | revokes invite/contact grant | owner only |
| `POST` | `/contacts/:id/invite` | initiates opt-in consent link | throttle + audit |
| `POST` | `/contact-location/sessions` | consented contact location session creation | independently verified contact token/session |
| `PUT` | `/contact-location/sessions/:id/position` | `{location}` | contact-owned session, active TTL |
| `DELETE` | `/contact-location/sessions/:id` | revoke | contact-owned session |

**Contact location rule:** The user's phone cannot query a contact's GPS merely by having their phone number. Recipient must explicitly opt into a temporary sharing session, and the backend checks expiry, consent, identity and freshness. Invitation acceptance requires phone authentication matching the invited number plus consent; see closure below. Contact setup target is 3–5, hard cap5; zero contacts never prevents SOS persistence.

## SOS: create, update, resolve

`POST /sos`  
Headers: `Idempotency-Key: <random UUID>`; include `X-Request-ID` if available.

```json
{
  "trigger_type":"MANUAL",
  "client_request_id":"3ebfd0dc-5d56-44ad-a018-413600a4b10b",
  "triggered_at":"2026-11-10T13:02:03Z",
  "location_status":"CURRENT",
  "location":{"lat":28.4595,"lon":77.0266,"accuracy_m":25,"captured_at":"2026-11-10T13:02:03Z","source":"gps"},
  "device_context":{"battery_pct":34,"motion_context":"WALKING","motion_confidence":0.72,"observed_at":"2026-11-10T13:02:03Z"}
}
```

`201` or `200` on idempotent replay:

```json
{
  "event_id":"52e79c8b-2ca6-48de-855c-910c86f27c38",
  "status":"CREATED",
  "dispatch_status":"QUEUED",
  "schema_version":1,
  "revision":1,
  "updated_at":"2026-11-10T13:02:05Z",
  "server_time":"2026-11-10T13:02:05Z",
  "created_at":"2026-11-10T13:02:05Z",
  "initial_location_at":"2026-11-10T13:02:03Z",
  "eligible_recipient_count":3,
  "expires_at":"2026-11-11T13:02:05Z",
  "replayed":false,
  "warnings":[],
  "emergency_call_number":"112"
}
```

Server transaction must create event, recipients, tracking grants and outbox rows together. Replays must not duplicate alert deliveries; account for race conditions. If no location: omit/null position and include `location_status: "UNAVAILABLE"`; do **not** reject emergency creation.

| Method | Route | Purpose | Rules |
|---|---|---|---|
| `GET` | `/sos` | owner's paginated history | no raw media URLs |
| `GET` | `/sos/:id` | event, delivery status, acknowledgement timeline | owner |
| `POST` | `/sos/:id/locations` | `{location}` with `captured_at` | only while active and from owner; rate/size controls |
| `POST` | `/sos/:id/resolve` | `{resolution:'SAFE'|'FALSE_ALARM',note?}` | idempotent; revoke grants and stop sharing |
| `POST` | `/sos/:id/cancel` | only CREATED with no leased/attempted delivery | atomic suppression or409/use resolve; no manual SOS countdown |
| `POST` | `/sos/:id/evidence/presign` | `{kind,size_bytes,mime,consent_version}` → temporary upload permission | reject unconsented/background misuse |
| `POST` | `/sos/:id/evidence/:assetId/complete` | marks upload received + scan pending | owner; media not public |

## Recipient portal (no install required)

- Initial link carries an opaque grant in a fragment, `https://<domain>/track#token=<opaque-token>`; strip before loading external resources. No authorization by predictable event ID. GET is inert; explicit POST exchange tolerates link scanners.
- `POST /tracking/exchange` with `{token,exchange_id}` returns `{grant_id,grant_kind,expires_at,csrf_token}` plus limited grant-named HttpOnly secure cookie; retry binding, selector header, expiry and revocation follow integration section11. Referrer policies, `no-store` and `noindex` on pages.
- `GET /tracking/event`: strictly recipient-scoped allowlist from integration section7; event/current position/freshness/context/own role and anonymous assisting count only. No owner history, contact phones, other contacts' GPS or unrestricted evidence.
- `GET /tracking/locations?cursor=...`: bounded authorized points, max100, opaque cursor; visible-page polling every10s in v1, no SSE/WebSocket dependency.
- `POST /tracking/acknowledge`: `{can_assist:boolean,eta_minutes?:number}` authenticated via tracking session; negative response accelerates escalation. No public event lookup API.
- `POST /tracking/logout`: clears recipient session.

## Journeys & routing

| Method | Path | Contract |
|---|---|---|
| `POST` | `/routes/evaluate` | `{origin:{lat,lon},destination:{lat,lon},depart_at,mode:'walking'}` → `{evaluation_id,score_version,routes:[{id,eta_seconds,distance_m,risk_indicator,confidence,explanations,segments_summary}],coverage_warning}` |
| `POST` | `/journeys` | `{destination,expected_arrival_at,selected_route_id?,auto_escalate,share_with_contacts,contact_ids:[]}` → Journey; sharing consent separate from overdue escalation |
| `GET` | `/journeys/:id` | owner journey status, clock, check-in history |
| `POST` | `/journeys/:id/arrive` | marks arrived, cancels delayed job (idempotent) |
| `POST` | `/journeys/:id/cancel` | ends monitoring, optionally contact update if already notified |
| `POST` | `/journeys/:id/check-in` | `{answer:'SAFE'|'NEED_HELP'|'EXTEND',extend_minutes?}`; server computes new ETA |

`/routes/evaluate` MUST distinguish score confidence from score and time-of-day inputs; if data insufficient: `risk_indicator:null`, `coverage_warning` and standard ETA still provided. Route requests get rate limiting and short retention.

## Safe shops, incident reporting and moderation

| Method | Path | Contract |
|---|---|---|
| `GET` | `/safe-shops?lat=&lon=&radius_m=` | nearby shops + verification, reported hours, `open_status` (`CONFIRMED_OPEN`,`SCHEDULED_OPEN`,`UNKNOWN`,`CLOSED`), last confirmation |
| `POST` | `/safe-shops/apply` | owner shop application, location, hours, consent to listing/alerts |
| `PATCH` | `/safe-shops/:id/availability` | pause/resume/confirm-open by authenticated owner |
| `POST` | `/incident-reports` | `{category,location,happened_at,description?}` → `PENDING`; rate limit |
| `GET` | `/incident-reports/aggregate` | privacy-preserving counts/areas; not raw submitter records |
| `GET` | `/admin/review-queue` | scoped moderator only |
| `POST` | `/admin/reports/:id/moderate` | `{action:'APPROVE'|'REJECT',reason}`; auditable |
| `POST` | `/admin/shops/:id/verify` | `{action:'ACTIVATE'|'REJECT'|'PAUSE',reason}`; auditable |

## Error and reliability contract

- `400 VALIDATION_ERROR`; `401 UNAUTHENTICATED`; `403 FORBIDDEN`; `404 NOT_FOUND` (avoid leaking resource existence); `409 CONFLICT`; `410 GRANT_EXPIRED`; `422 PERMISSION_UNAVAILABLE`; `429 RATE_LIMITED`; `503 DEPENDENCY_UNAVAILABLE`.
- Return `request_id` with every error. Never return precise coordinates/phones/tokens in logs or generic errors.
- SOS creation is idempotent: retries with same user + client request produce same event even after network timeout. Outbox deliveries have unique deduplication keys.
- Provider-received means queued/accepted **not delivered**. Document exact provider receipt semantics per adapter.
- Define future generated OpenAPI/JSON schemas directly from this spec before execution agents code in parallel; ensure backend schema tests and mobile mock contract tests run against the same fixture.

## Complete v1 schema closure

No ad hoc `{...}` fields are allowed in generated schemas. The named objects below expand the compact catalogue. Lists use the common cursor envelope; mutation responses return the named object unless explicitly204/202. Every snapshot has `schema_version:1,revision,updated_at,server_time`; all object IDs are UUIDs, timestamp and bounds follow integration section2. Standard error envelope applies to every endpoint. Every mutation follows its idempotency rule. P1-T03 must enumerate success/error status codes and examples for every row, not just SOS.

| Object | Required fields (question mark = optional input; null = unavailable output) |
|---|---|
| Profile | `id,display_name,locale:'en'|'hi',phone_e164,consents:{version,monitoring:false|true,evidence:false|true,shop_alerts:false|true},capabilities:{push_live,monitoring,duress,key_trigger,shop_alerts,evidence}`; capabilities server-controlled |
| Contact | `id,name,phone_e164,priority:1..5,invite_status:PENDING|VERIFIED|DECLINED|REVOKED,location_available:boolean,consent_at:null|timestamp`; owner sees stored number, never contact GPS |
| Recipient | `id,contact_id,priority_rank,role:PRIMARY|ALTERNATE,acknowledgement,acknowledged_at:null|timestamp,eta_minutes:null|integer,channels:[{channel:SMS|PUSH,status:DeliveryStatus,last_attempt_at:null|timestamp}]` |
| SosCreate | `trigger_type` (JOURNEY_OVERDUE server-only), `client_request_id,triggered_at,location:Location|null,location_status:CURRENT|APPROXIMATE|STALE|UNAVAILABLE,device_context?:ContextPatch` |
| SosCreated | `event_id,status,dispatch_status,created_at,initial_location_at:null|timestamp,eligible_recipient_count,expires_at,replayed:boolean,emergency_call_number:'112',warnings:[]` |
| SosDetail | SosCreated plus `trigger_type,resolution:null|SAFE|FALSE_ALARM|EXPIRED,position:Location|null,location_age_s:null|number,context:ContextView,recipients:Recipient[],evidence:EvidenceMetadata[]` |
| ContextPatch | optional `battery_pct:0..100,motion_context:UNKNOWN|STATIONARY|WALKING|RUNNING|VEHICLE,motion_confidence:0..1,speed_mps:0..100,observed_at`; no arbitrary strings or uploaded landmark. ContextView adds server `landmark:null|{label,source,observed_at}` and freshness |
| PositionWrite | `sample_id,location:Location`; response `{sample_id,accepted:boolean,is_latest:boolean}`. Duplicate same sample/body replay, mismatch409 |
| TrackingView | `event_id,event_status,started_at,trigger_class:MANUAL|POTENTIAL_DISTRESS|JOURNEY_OVERDUE,shared_name,position:Location|null,location_age_s,context,priority_role,own_acknowledgement,assisting_count,evidence:EvidenceMetadata[],expires_at`; evidence list filtered by consent |
| Journey | `journey_id,status,origin:Location|null,destination:{lat,lon},selected_route_id:null|UUID,expected_arrival_at,checkin_due_at,escalate_at,auto_escalate,share_with_contacts,contact_ids,deadline_version,sos_event_id:null|UUID,expires_at` |
| RouteEvaluation | `evaluation_id,score_version,data_version,computed_at,routes:RouteCandidate[],roles:{fastest:null|UUID,balanced:null|UUID,lower_estimated_risk:null|UUID},coverage_warning:null|string,alternatives_reason:null|string` |
| RouteCandidate | `id,geometry:GeoJSON.LineString,eta_seconds,distance_m,risk_indicator:null|integer0..100,confidence:0..1,detour_pct,reason_codes:string[],explanations:string[],segments_summary:[{segment_ref,arrival_at,indicator:null|number,coverage,source_refs:[]}],worst_stretch:null|{geometry,reason_codes},source_refs:string[]` |
| Shop | `id,name,position:{lat,lon},public_phone:null|string,status:PENDING|ACTIVE|PAUSED|REVOKED,verification_level:NONE|PILOT_CHECKED,verified_at:null|timestamp,hours:{timezone,weekly:[{day:1..7,intervals:[{start:'HH:mm',end:'HH:mm'}]}],exceptions:[]},open_status,confirmed_at:null|timestamp,distance_m:null|number,walking_eta_s:null|number,listing_consent_version,opt_in_alerts,agreement_version:null|string` |
| Report | `id,category,location:Location,happened_at,description:null|string,status,created_at,expires_at,moderation_reason:null|string`; raw record owner/moderator only |
| EvidenceMetadata | `id,kind:AUDIO|PHOTO|VIDEO,mime,size_bytes,duration_s:null|number,captured_at,status,delete_after`; no bucket key or public URL |

`GET /sos` returns summary items `{event_id,trigger_type,status,dispatch_status,created_at,ended_at:null|timestamp}`; GET by ID/reconciliation returns SosDetail. GET contacts uses cursor envelope rather than legacy bare array. POST locations uses PositionWrite (adds dedupe sample ID to older example). SOS context PATCH input must include `observed_at`, at least one actual field. Server owns landmark generation. POST resolve input `{resolution:SAFE|FALSE_ALARM,note?:string(max200)}`, response SosDetail. Cancel input empty object, response SosDetail. ACK eta bounds0–240min, null when cannot assist; response `{acknowledgement,eta_minutes,revision}`. Resolve/cancel never claims messages recalled.

### Required endpoints closing baseline gaps

| Phase | Method/path | Exact input → output | Authorization / failures |
|---|---|---|---|
| 1 | `PATCH /me/consents` | `{version,monitoring?,evidence?,shop_alerts?}` → Profile | owner; withdrawal ends affected capture/access, not SOS |
| 1 | `POST /identity/browser-session` | `{id_token}` → `{expires_at,csrf_token}` +15min cookie | verifies provider token and revocation; never logs body |
| 1 | `POST /identity/logout` | `{}` →204 | clear cookie; authenticated browser |
| 1 | `POST /contacts/invitations/accept` | `{token,consent_version}` → Contact | verified phone bearer/cookie matches invite |
| 1 | `POST /contacts/invitations/decline` | `{token,block_future_invites:boolean}` →204 | verified invited phone; no unauthenticated change |
| 1 | `GET /contacts/invitations` | no body → list `{invite_id,owner_display_name,expires_at,status}` | contact's own verified phone identity only |
| 1 | `POST /contacts/:id/invite` | `{}` → `{invite_id,status:'PENDING',expires_at}` | owner; encrypted token sent by adapter, not returned for impersonation |
| 1 | `DELETE /contact-consents/:contactId` | no body →204 | invited verified identity, withdraws grants/session and future alerts |
| 1 | `PUT /devices/:installationId` | `{push_token,platform:'ANDROID',notifications_enabled:boolean}` → `{device_id,registered_at}` | own installation UUID, encrypted token; rotation/uniqueness enforced |
| 1 | `DELETE /devices/:installationId` | no body →204 | owner, unregister logout/lost device |
| 1 | `GET /sos/by-client-request/:clientRequestId` | no body → SosDetail | owner; route registered before `/:id` |
| 1 | `POST /sos/intents/:clientRequestId/terminate` | `{reason:SAFE|FALSE_ALARM}` → `{intent_state:'TERMINATED',event_id:null|UUID,status:null|SosStatus}` | same intent lock as create; tombstone stops late creates |
| 1 | `POST /sos/:id/recipients/:recipientId/tracking-grant` | `{}` → `{grant_id,expires_at,dispatch_status:'QUEUED'}` | owner reissue, revokes old, never returns raw grant |
| 1 | `DELETE /sos/:id/recipients/:recipientId/tracking-grant` | no body →204 | owner; stops active sessions immediately |
| 1 | `POST /providers/:provider/receipts` | adapter-specific signed raw body →204 | signature+replay+known message mapping; only configured adapters |
| 1 | `GET /health/live`, `GET /health/ready` | no body → `{status:'OK'|'DEGRADED'}` | no secrets/version info; ready checks DB, not SMS network |
| 2 | `POST /journeys/:id/locations` | PositionWrite → position receipt | owner active/overdue only |
| 2 | `POST /journeys/:id/sharing` | `{enabled,contact_ids:UUID[]}` → Journey | owner explicit consent, creates/revokes journey-only grants |
| 2 | `GET /tracking/journey` | no body → Journey projection with position/freshness only | JOURNEY_READ cookie; no history/evidence/contact list |
| 2 | `GET /incident-reports/mine` | cursor query → list Report | owner |
| 2 | `POST /incident-reports/:id/withdraw` | `{}` → Report | owner or moderator removal with reason; score invalidation |
| 2 | `GET /safe-shops/mine` | cursor query → list Shop | owner includes pending/paused |
| 2 | `PATCH /safe-shops/:id` | `{name?,public_phone?,hours?,listing_consent_version?}` → Shop | owner; material identity/location changes require re-review, location change via new application |
| 2 | `DELETE /safe-shops/:id` | no body →204 | owner withdrawal, revoke active shop sessions |
| 2 | `GET /admin/reports/:id`, `GET /admin/shops/:id` | no body → Report or Shop plus sanitized audit list | MODERATOR; no SOS permissions |
| 3 | `PATCH /sos/:id/context` | ContextPatch → `{context,revision}` | owner active only; latest observed values win |
| 3 | `GET /evidence/:assetId` | no body → EvidenceMetadata | owner or current explicitly authorized recipient |
| 3 | `GET /evidence/:assetId/content` | no body → authenticated MIME stream | AVAILABLE and current scope each request; no-store, bounded stream TTL30s/recheck |
| 3 | `DELETE /evidence/:assetId` | no body →204 | owner; immediately revoke, asynchronous storage deletion |
| 3 | `POST /sos/:id/shop-alerts` | `{shop_id,sharing_consent_version}` → `{shop_alert_id,status:'QUEUED',expires_at}` | owner + active opted-in shop/agreement, feature gate |
| 3 | `GET /tracking/shop-alert` | no body → `{event_id,status,position,location_age_s,arrival_eta_s:null|number,expires_at}` | shop owner phone identity plus shop-scoped session; no bearer alone |
| 3 | `POST /tracking/shop-alert/acknowledge` | `{can_assist:boolean}` → own acknowledgement | same shop scope; cannot alter trusted primary |
| 4 | `POST /me/export` | `{}` →202 `{job_id,status:'PENDING'}` | recently authenticated owner (auth_time<=5min) |
| 4 | `GET /me/export/:jobId` | no body → `{job_id,status,expires_at:null|timestamp}` | owner |
| 4 | `GET /me/export/:jobId/content` | no body → authenticated JSON stream | owner, no contact GPS/other private data, artifact TTL24h |
| 4 | `DELETE /me` | `{confirm_end_active_sharing:boolean}` →202 `{deletion_job_id,status:'PENDING'}` | recent auth; if active and false409, explicit true resolves/revokes first |

### Remaining existing-route inputs expanded

- `POST /contacts` `{name:string1..80,phone_e164,priority:1..5}`; PATCH allows name/priority only. Concurrent reorder uses contact revision/If-Match (409 on stale); deterministic priority then ID ties. Creation cap enforced under owner row lock. `GET /me` creates missing minimal app-user mapping idempotently after verified phone identity.
- Contact location start `{contact_id,consent_version,duration_minutes:1..120}` → `{session_id,expires_at}`. Verified invited principal must own this relationship. PUT position uses PositionWrite; DELETE returns204. No query endpoint exposes contact position to owner.
- Evidence presign `{kind,mime,size_bytes,sha256,captured_at,duration_s:null|number,consent_version,recipient_ids:UUID[]}` → `{asset:EvidenceMetadata,upload:{url,method:'PUT',required_headers:{},expires_at}}`; upload URL is private capability, never logged. Complete `{sha256}` →202 `{asset_id,status:'QUARANTINED'}`; replay returns same processing status.
- Route evaluate input as original table; origin/destination lack timestamps, departure range now to+7days, within configured pilot polygon. Unknown/outside area →422 with no fabricated route. `GET /safe-shops` response list Shop; radius default1000/max5000; location query redacted from HTTP logs.
- Shop apply `{name,position:{lat,lon},public_phone,hours,listing_consent_version,opt_in_alerts,agreement_version:null|string}` → Shop(PENDING). Availability `{action:'PAUSE'|'RESUME'|'CONFIRM_OPEN'|'CLOSE',expected_revision}` → Shop; resume never bypasses verification. Moderate shop `{action:'ACTIVATE'|'REJECT'|'PAUSE',reason:string1..500,expected_revision}` → Shop; reject maps REVOKED, not public. Moderate report same revision rule, APPROVE/REJECT/REMOVE, REMOVE→WITHDRAWN.
- Report create `{category,location:Location,happened_at,description?:string<=1000}` → Report(PENDING). Aggregate query bbox (bounded pilot/max25km²), time range<=90d → `{cells:[{cell_id,geometry:GeoJSON.Polygon,category,count_bucket:'3-5'|'6-10'|'11+',updated_at}],suppression_m:250}`. Authenticated users only; no sparse/raw returns.
- Admin queue query `{kind:'REPORT'|'SHOP',cursor?}` → cursor list `{kind,id,submitted_at,status,label}`. Detail records include only needed moderation fields, never unrelated private users.
- Journey arrive/cancel `{}` → Journey; check-in `{answer:'SAFE'|'NEED_HELP'|'EXTEND',extend_minutes?:integer1..60,expected_deadline_version}` → Journey; stale version409. Initial origin may use last-known or null. Optional selected route must belong to owner and nonexpired evaluation; route unavailable does not block manual ETA entry.

P1-T03 produces JSON-valid success/error fixtures for all schemas and operation IDs, with synthetic provider mode. Missing provider/device resources are disabled capabilities, not guessed credentials or fake PASS results.

## Review-1.2 remaining endpoint closure

| Phase | Method/path | Input → output | Security/semantics |
|---|---|---|---|
|1 | POST /contact-consents/:contactId/reopen | {consent_version} → Contact | verified invited principal matching stored phone; active owner relationship required; clears own block/decline and explicitly re-consents future alerts, never resurrects old grants/GPS or revives owner-revoked contact |
|2 | GET /journeys | optional repeated status query ACTIVE/OVERDUE/ARRIVED/ESCALATED/CANCELLED, cursor, limit → cursor list Journey | owner only; restores active session after process death; no arbitrary owner parameter |
|3 | POST /tracking/navigation | {origin:Location} → {eta_seconds:number,distance_m:number,computed_at:timestamp,expires_at:timestamp,source:string,server_time:timestamp} | SOS_READ selected grant/cookie+CSRF; explicit responder geolocation consent; routing only, not contactGPS sharing |

POST journeys input is {origin?:Location|null,destination:{lat,lon},expected_arrival_at,selected_route_id?:UUID,auto_escalate:boolean,share_with_contacts:boolean,contact_ids:UUID[]}. Origin defaults null; do not pull historical GPS from unrelated events. ETA must be in future and≤12h from server_now; location updates independent. EXTEND may not move ETA beyond journey.started_at+12h, otherwise409 INVALID_TRANSITION. Sharing false requires contact_ids=[]; true requires explicit verified IDs, max5. Escalation may have0 contacts with explicit warning. GET tracking/journey returns {schema_version:1,revision,updated_at,server_time,journey_id,status,shared_name,position:Location|null,location_age_s:number|null,expected_arrival_at,expires_at}; no destination/history/contact list/evidence in recipient projection.

Contact snapshot fields remain in named schema; separate invitation list items include contact_id so authenticated recipients can revoke/re-consent their own relationship. ContextView, Hours exceptions, Shop availability override, strict upload headers and response metadata rules are in integration section11. Shop listing response never exposes owner account ID, private phone, verification documents or internal notes. Authenticated moderator detail may include owner identity only as needed for verification, with separate allowlist.

Error recovery_action replaces old informal use_resolve flags. Tracking endpoints require X-Tracking-Grant-ID selector with the corresponding grant-named cookie; POST exchange returns grant_id for this purpose. Revision query on tracking event and ownerSOS detail is optional nonnegative integer after_revision; unchanged204 carries X-Server-Time and no response body. Lists have no invented aggregate revision.

Navigation origin and currentSOS destination require age≤60s/accuracy≤100m for a fresh personalizedETA; otherwise422 STALE_LOCATION and offer external directions without a claimed liveETA. Timeout5s/503 if routing unavailable; rate≤1/30s per grant, estimate TTL120s. Send Idempotency-Key for retries; no responder origin retained in DB/logs or exposed to owner, no implicit contact_location_session. External directions open only on explicit action with provider disclosure; geolocation decline keeps allSOS/ACK controls usable. This endpoint is not an enrichment dependency of initialSOS.
## Implemented Phase 1/2 contract

The subsequent demo implementation materializes64 operations/72 schemas in [packages/contracts/openapi.yaml](../packages/contracts/openapi.yaml). [CONTRACT_LOCK.md](../packages/contracts/CONTRACT_LOCK.md) records the hash and single-executor corrections. In addition to this specification's endpoint inventory, authenticated `GET /v1/contact-consents` lists already-consented contact relationships for temporary GPS controls. Journey output destination becomes nullable after terminal privacy purge; create input remains required. Later-phase routes in this document remain planned until separately generated/reviewed. `/v1/dev/inbox` is local-only development tooling, not a public delivery contract.

## CR-003 implementation boundary

The canonical [OpenAPI](../packages/contracts/openapi.yaml) now includes80 operations/85 schemas. Existing Phase1/2 semantics are preserved. Local evidence supports one-use owner-authenticated `PUT /evidence/:assetId/upload` with exact MIME and `x-amz-checksum-sha256` (hex); this binary operation has no JSON Idempotency-Key requirement. The returned relative URL is a fake-storage adapter exception to the production HTTPS presigned contract. Media is encrypted/quarantined, and complete only queues processing. WAV/JPEG/PNG structural validation and re-encoding are available locally; MP4/real malware scanning/storage and asynchronous landmark lookup remain unavailable.

`POST /tracking/navigation` accepts explicit `{origin,consent:true}` and returns a labelled straight-line estimate without storing origin. No consent/location still leaves tracking usable. Shop-alert endpoints fail FEATURE_DISABLED without operational agreements. `GET /me/deletion/:jobId` returns actual owner deletion status after account disablement; it cannot reopen ordinary account APIs. Export/delete require verified auth_time=5min, and DELETE retries return the same job. See [CR lock](../packages/contracts/CONTRACT_LOCK.md).
