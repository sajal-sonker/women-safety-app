# 15 — Environments, monitoring, provider adapters and runbooks

## Repository/deployment topology

```
apps/mobile          React Native, Android Kotlin modules
apps/responder-web   Next.js browser responder + role-scoped moderation pages
services/api         Express TypeScript REST API
services/worker      Postgres-backed notification/expiry jobs
packages/contracts   Shared API schemas, enums, mock fixtures
packages/shared      Non-sensitive helper types
ml/                  Training code, model cards, exported LiteRT artifacts
infra/               Docker Compose, migrations, CI, environment examples
```

## Local, staging and limited pilot

- **Local:** Docker PostGIS, Node API/worker, Next.js, fake SMS and FCM, synthetic contact IDs, fictional shop and location data. Use local API emulator or stubs. No real distress message by default.
- **Staging:** isolated auth project with test numbers, provider sandbox credits, privacy redacted logs; no actual public shop listing.
- **Pilot:** explicit contact and shop consent, measured supported-device set, provider compliance and privacy/legal review completed, emergency disclaimer, abuse response process.

## Configuration categories (values supplied by deployer, never commit secrets)

`DATABASE_URL`, `FIREBASE_PROJECT_ID`, `SMS_PROVIDER`, `SMS_API_KEY`, `FCM_SERVICE_ACCOUNT`, `STORAGE_BUCKET`, `STORAGE_KMS_KEY`, `MAP_ROUTER_URL`, `PUBLIC_TRACKING_BASE_URL`, `SCORE_VERSION`, `TRACK_TOKEN_TTL`, `OUTBOX_RETRY_LIMIT`, `MONITORING_FEATURE_FLAG`, `DURESS_FEATURE_FLAG`, `KEY_TRIGGER_FEATURE_FLAG`, `SHOP_ALERT_FEATURE_FLAG`.

Review correction: FCM_SERVICE_ACCOUNT is not authorization to send emergency pushes. Live emergencyFCM remains disabled under D30. Implement PUSH_PROVIDER=fake by default with provider capability/permission manifest; any live replacement/permission is an explicit reviewed dependency. Required extra configuration includes AUTH_MODE/local-emulator guard, permitted tile/style host, storage quarantine/scan, encryption key references, exact event/grant/session TTLs, test recipient allowlist and provider budget cap. No secret values belong in documentation or mobile.

Use secret manager or managed injected environment. Device app contains only public client config; use protected provider APIs server-side. Never put SMS API keys or server tokens in React Native.

## Cost and service limits

OTP and transactional SMS can be billed per message; maps routing and place lookup may have licensing/usage charges; evidence upload/storage has a per-user cost. Before provider signup, estimate **test messages/day, concurrent active SOS, average GPS updates per minute, storage per 10-second clip, OTP resend rate, map requests per journey**. Set test caps and budget alerts. Feature fallback on quota exhaustion must not indicate false success.

## Observability (redacted)

Use structured events: `sos_created`, `outbox_enqueued`, `provider_request_accepted`, `delivery_confirmed_if_supported`, `recipient_acknowledged`, `contact_escalated`, `tracking_grant_revoked`, `journey_overdue_triggered`, `route_score_unavailable`, `monitoring_service_stopped`. Metrics: p50/p95 server dispatch queue latency, provider failures by type, outbox age/dead-letter count, location freshness, monitoring service uptime when activated, route data coverage, shop open-status confidence. Never log GPS coordinates, phone number, PIN, media content or full tracking URL.

## Runbooks

1. **SMS outage:** monitor queue, confirm provider status, enable configured alternate provider (if any), show app failure semantics, publish emergency call fallback. Never replay duplicates blindly.
2. **Stolen tracking URL:** revoke grant and issue new invite/link only to verified recipients; audit access, support user safety action.
3. **Compromised admin/shop account:** revoke credentials, freeze shop alerts, review audit, reverify participants.
4. **Incorrect route scores:** disable risk-ranking feature flag and fall back to standard routes with prominent information; retain scoring version for investigation.
5. **Suspected recording leak:** revoke streaming grants, disable evidence capture, rotate credentials, assess notification obligations.
6. **Mobile background failure:** mark monitoring as unavailable/degraded; use manual SOS/112; do not imply ongoing protection.

## Release checklist

Migrations applied and backed up; restore test; TLS and headers; provider webhook signature validation; token grants scope tested; permissions and Play policies reviewed; contact invite/consent tested; legal/campus review if live pilot; crash monitor and rollback; fake-provider flags disabled only where integration verified; real-device support matrix and user disclaimer published.
