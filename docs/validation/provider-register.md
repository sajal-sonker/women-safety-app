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
