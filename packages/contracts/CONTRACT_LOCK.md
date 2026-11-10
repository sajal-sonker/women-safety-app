# Phase 1/2 integration baseline

CR-004 (10 November2026) extends the **native-only** monitoring lifecycle to the licensed YAMNet confirmation-only baseline, plus dismissMonitoringCheckIn. HTTP schemas/hash/paths and SOS trigger policy remain unchanged. Local Profile.capabilities.monitoring is now true for available test software, not permission for automatic dispatch. The existing server consent API records the user's choice; native start requires explicit session consent and OS permissions. `ML_FUSION` automatic sending remains disabled. Model source/checksum/tensors/fusion defaults are locked in ml/models/manifest.json and packaged through an explicit five-file Gradle allowlist; private training data/evaluation inputs are never application assets. LiteRT1.4.2 is pinned to preserve RN/Kotlin2.2 compatibility (2.3.2 requires incompatible Kotlin2.4 metadata). Real phrase-model and physical/independent graduation remain open.

Canonical input: [openapi.yaml](openapi.yaml), OpenAPI3.1, `/v1`, 64 operations/72 named schemas. JSON notation is valid YAML1.2. SHA256: **600ced35aec5aeb350c83bc0ef5a782f58b9bbd874befcf2a6356ba4bd4993db**. `npm run contracts:check` checks deterministic TS, Ajv schema, operation catalogue and Kotlin generation. Native startup compares the JS and Kotlin hash. All implemented operation inputs and successful outputs are Ajv-validated by the API.

This is a **single-executor P1/P2 integration baseline**, not independently approved G0 or a full four-phase API freeze. The user authorized both demo phases together. No parallel executor invented a second contract. Phase3/4 capabilities are false, and later-phase schemas must pass change control before implementation. Independent acceptance remains pending.

## Recorded implementation corrections

- Added authenticated `GET /contact-consents` so an already-consented contact can find temporary location controls after its original invitation expires. It exposes relationship/owner identity and consent metadata, not another contact's coordinates.
- `Journey.destination` output is nullable after24h terminal privacy purge. `JourneyCreate.destination` remains a required point. Escalation completes the journey lifecycle but does not resolve its independent SOS. Retention has an API regression test.
- Pagination is descending by `(created_at,id)`, journeys `(started_at,id)`, tracking samples `(received_at,id)`. Cursors preserve database microseconds. Tracking queries remain grant-scoped.
- `/v1/dev/inbox` is an additional **local-only** authenticated development endpoint outside the public contract. It filters fake messages by the signed-in phone, returns private links and cannot be enabled in a non-local environment. No application consumer relies on it for live delivery.

## Shared rules and ownership

Backend owner controls this file, OpenAPI, migration allocation and generation. Mobile/web/worker consume generated types and the same enum/error/auth/idempotency semantics. Change input first, regenerate, update all consumers and affected tests, record the new hash here, and obtain independent review before parallel/live execution. Never hand-edit generated artifacts. `scripts/bootstrap-contract.mjs` is the initial materializer; if retained/changed it must reproduce the canonical source exactly.

SOS uses one UUIDv4 intent key shared by body/header, immutable payload hash and terminal tombstones. Retrying cannot create a second alert or revive termination. Ordinary mutation keys are scoped by principal/operation/resource. Initial SOS commits recipients/grants/outbox atomically before providers; routing/enrichment never participates. Accepted, provider accepted, delivered and human ACK remain separate.

Bearer Firebase ID token authenticates owners; roles are server assignments. Tracking uses256bit fragment bootstrap, explicit exchange UUID, hashed token/session material, retry-bound encrypted recovery, per-grant HttpOnly cookies, grant-selector header, CSRF/Origin checks and immediate terminal revocation. Journey grants cannot read SOS. Contact GPS requires its own session consent. No device token or public report yields permission to track.

SQL owner has migrations001–009 plus009a in `services/api/migrations/`; future phases start010. Never edit an applied checksum. Provider-neutral send outcomes are in [provider-interfaces.ts](src/provider-interfaces.ts); the only executable delivery adapter is fake. Realtime is bounded revision-aware polling, not WebSockets. See [integration semantics](../../docs/INTEGRATION_CONTRACTS.md).

## CR-003 � Phase 3/4 controlled-demo integration

10 November2026. Canonical SHA256 **f92a2928a857a764c551944cd6c1037bc9ef8960fc2874a435608a55743ba8f1**;80 operations including3 binary handlers,85 named schemas. Existing Phase1/2 schema/operation semantics remain unchanged. Generated operations catalogue excludes binary handlers; explicit stream routes enforce the same auth/scope/size/revocation contract. Backend and mobile are integrated by one sequential executor; independent review is still pending.

Added010 evidence/scopes/audit/shop gate,011 recent-auth privacy jobs/deletion ledger; no applied checksum was edited. Added context PATCH, evidence presign/complete/metadata/upload/content/delete, transient tracking/navigation, disabled shop-alert surfaces, recent-auth export/content/deletion and owner deletion-job status. Native seam adds PIN/fake-call/focused-key/evidence/deletion controls and an honestly labelled motion-only fallback. Profiles advertise local evidence and duress; audio monitoring/global keys/shop delivery remain unavailable.

Local evidence upload is a one-use owner-authenticated relative URL plus exact Content-Type/checksum, not an externally presigned S3 URL. Binary PUT is exempt from JSON mutation idempotency headers and refuses reuse; asset ownership, byte count, hash, MIME, upload TTL, consent and event state are enforced. JSON mutations retain their normal keys. Evidence metadata/content accepts either owner identity or a valid selected SOS tracking grant. Sanitized bytes use encrypted fake DB storage; real storage/scanner/MP4 adapters remain external.

DELETE /me returns a stable deletion job after a lost response, revokes immediately, persists the newer encrypted ledger before202, and only its scoped status endpoint permits the deleted principal to authenticate. General APIs reject deleted principals, including old valid tokens and restored profiles in the ledger. Recent-auth uses verified provider auth_time, also persisted in identity browser sessions.
