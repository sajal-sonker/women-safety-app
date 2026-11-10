# Provider register — controlled demo

| Integration | Status | Implementation / release prerequisite |
|---|---|---|
| Phone auth | EMULATOR_VALIDATED | Browser emulated OTP flow executed; native SDK compiled. Real Firebase project, SHA configuration, quotas/consent and controlled phone validation absent |
| SMS | MOCK_ONLY | Encrypted per-recipient local inbox; fake idempotent acceptance and signed receipt endpoint. No actual delivered receipt claimed. Live adapter requires approved provider, India sender/template compliance, budget/allowlist and callback/query conformance |
| Push | BLOCKED_LIVE | Device registration API/capability flags; no emergency FCM sender. Fake interfaces are not a real push path. [FCM guidance](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority) excludes emergency/high-risk uses |
| Maps/routes | SYNTHETIC_DEMO | Fictional Lucknow graph/GeoJSON, no external tile requests. Private GraphHopper HTTP adapter implemented but not provider-validated; real licensed source import/walk-access/source matching required |
| Shops/police/help | SYNTHETIC_DEMO | Invented assistance points; no actual verified participants, police dispatch or operational agreements |
| Hosting/storage | LOCAL_ONLY | API/worker/PostGIS/web run locally. No production host, TLS domain, evidence object storage or signed deployment is provisioned |

Secrets are environment-injected and encrypted message/session material uses a separate data key. Ordinary automated tests cannot select a live provider: startup rejects non-fake delivery configuration. Fake provider acceptance remains distinct from DELIVERED and human acknowledgement. No costs or delivery guarantees are invented. Future provider implementation must include bounded timeout, idempotency capability, unknown-outcome policy, signed callbacks, replay protection, quotas and redacted real-provider evidence before status changes to REAL_VALIDATED.
# Phase 3/4 continuation — 10 November 2026

Local media: LOCAL_ENCRYPTED_FAKE (PostgreSQL ciphertext), strict WAV/image format validation and image metadata stripping. Production private object host, malware scanner, MP4 processor and geocoder: BLOCKED_EXTERNAL/unconfigured. Shop emergency delivery: FEATURE_DISABLED, no operational agreement. Audio detector update (CR-004): licensed pretrained YAMNet confirmation-only baseline is bundled; Hindi/English phrase data, measured detector/device evidence and automatic dispatch graduation remain blocked. Fake auth/delivery remains the only configured test path. Nothing in the new implementation authorizes live sending or production provider claims.
