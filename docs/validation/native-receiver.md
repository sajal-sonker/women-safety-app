# Same Android app for sender and recipient —13 November2026

Phase:4 follow-up for the authorized local prototype. Requirements: CONT-01, SOS-03, SOS-07, JOUR-01 and the user's explicit same-app invitation/receiver request. Browser receiver remains compatible and optional.

Completed:

- `apps/mobile/src/receiver.ts`, `Inbox.tsx`, `App.tsx`: Contacts has My contacts/Inbox. Explicit invitation acceptance/decline, incoming SOS and journey cards, temporary shared location freshness, Maps action, assistance response/optional ETA, consent withdrawal/re-consent and an incoming-alert banner from other screens. Same account/APK can act in both roles. Own contacts refresh after acceptance. No mandatory name/receiver setup before manual SOS.
- Foreground-only, sequential scheduled polling, immediate return checks, account-generation guards and identity-keyed navigation/inbox. A failed detail read clears position/actions; terminal grants show Sharing has ended and stop detail retries. The native bridge supplies structured error codes separately from its generic message; regression uses this actual error shape. Header/banner elements retain their React identity across safety refreshes, avoiding interrupted header touches and repeated live announcements merely because the root refreshed. Repeated native header navigation passed during polling.
- `services/api/src/modules/tracking/recipient.ts`, contacts and dispatcher: five bearer-authenticated operations reuse existing invitations/grants/views/ACK and transaction/idempotency machinery. Exact invited phone required for decisions; both principal ID and phone required for grant access. No browser token exchange or local fake-message endpoint is used by native receiver. Live consent/expiry/termination checks precede cached ACK replay. SOS network delivery already has a dedicated executor, separate from inbox/general bridge requests; durable SOS remains independent.
- [Two-phone setup and rehearsal](../TWO_ANDROID_DEMO.md), updated entry-point docs, contracts/decision log and phone installation helper. Both USB phones get separate reverse mappings to the same PC API/Auth emulator. Browser/Metro are unnecessary for the bundled APK.

Contract changes: CR-009 adds POST invitation ID accept/decline, GET received-alerts list/detail and POST recipient acknowledgement.85 operations/90 schemas; SHA256 `3da863ac36a7b0923ce4014466018acac32bb78da1023d1f9f00522e7371b633`. Canonical OpenAPI, TS/Ajv/operation catalogue and Kotlin regenerated together. No migration, provider adapter, native method, sensing/automatic-SOS policy or browser-cookie change.

Tests:

| Check | Result |
|---|---|
| `npm test` |36 passed; real isolated PostgreSQL/PostGIS, including new recipient security and invitation tests |
| `npm run test:mobile` |33 passed, including actual navigation/banner, explicit acceptance, native-shaped revocation error, foreground polling, background pause/resume, old-account response rejection and position hiding |
| Typecheck/lint |Passed |
| `npm run test:web` |6 passed,42.0s; existing browser SOS/ACK/resolution, journey, privacy and receiver recovery/isolation remain compatible |
| Contract generation/check, Markdown links/repository guard |Passed;56 Markdown paths; main excludes agent context and credentials |
| Android demo build, JVM tests, instrumentation APK compilation |Build passed;27 JVM tests. Instrumentation APK compilation is not a physical instrumentation run |
| Final arm64 APK |163,048,999 bytes; bundled JS/models/licences, all native libraries'16KB alignment, signing verification and zip alignment passed |

Rebuilt phone artifact: `apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`, SHA256 `1e62c1c9f6f369664825dfd4a6b42b2b12a7351edc2481cdac1196e1adec2039`. Standalone arm64 demo build uses loopback API4001/Auth9099 through per-device USB reverse mapping. Static checks do not constitute a physical Moto run. Local readiness check passed for API/database/Auth/browser/model/APK; no physical phone connected. Test emulator stopped after rehearsal; PC services left running.

Android runtime results: isolated Android16/API36 x86_64 emulator, same standalone demo variant with synthetic accounts and generated coordinates. Native receiver accepted a newly sent invitation; owner API confirmed VERIFIED. SOS appeared automatically, native assistance response reached owner, and new location accuracy/time appeared without refresh. Background then owner resolution then return cleared location/actions with the terminal message. Shared journey appeared and arrival revoked access. A subsequent native pass repeatedly opened Settings during polling and signed out, confirming recipient data disappeared. These tests use an API-driven second identity and **one Android emulator**, not two physical phones; both physical-phone behavior and actual Maps launch remain pending. No microphone, emergency calls, live SMS or real coordinates used. Initial automation attempt failed because the automation process was killed/interfered with; retry added bounded scroll/retry handling. A later header tap was missed before its remount correction; the final repeated navigation/sign-out pass succeeded. The native-shaped terminal-error correction was validated separately in regression and the subsequent Android pass.

Security/privacy review: wrong number cannot accept; wrong principal/owner/stranger cannot read recipient grants; matching phone without accepted principal fails; no owner SOS endpoint access; no recipient list/secret token in summaries; expired/declined invite cannot create consent; no ACK through journey grant; resolution denies cached ACK; consent withdrawal revokes journey reads. Existing evidence access remains separately scoped. No automatic contact verification, public location endpoint, recipient GPS sharing, external messaging provider or credentials added.

Known limitations: active-grant inbox (max100 summaries), foreground updates only, no closed-app push, PC/USB required, OTP/delivery emulated. Map button opens the phone's Maps application. Invitation consent is directional; reverse-role demo needs a separate reciprocal invite. Existing privacy/evidence, provider and independent release gates remain separate. No claim of zero bugs or reliable emergency delivery. Physical Moto Android16 testing remains the user's next check.

Next prerequisites: local services and rebuilt APK on both phones, separate signed-in numbers and recipient acceptance; use the linked rehearsal. Production deployment is deferred by user scope.
