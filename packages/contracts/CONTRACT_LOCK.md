# Phase 1/2 integration baseline

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
