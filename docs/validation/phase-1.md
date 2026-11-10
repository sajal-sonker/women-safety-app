# Phase 1 implementation evidence

Date:10 November2026. Baseline:review-1.2; single sequential backend/mobile executor under the user's explicit authorization to implement and push Phases1/2. This is executor evidence, **not independent reviewer approval**. G0/G1 remain **PARTIAL** until missing native/security/provider evidence is reviewed. Phase2 was implemented in the same controlled fake-provider batch at the user's request; it does not imply a live gate waiver.

## Implemented scope and paths

| Tasks / requirements | Result and evidence |
|---|---|
| P1-T01 scaffold | Root workspaces/lockfile, scripts, env initializer, CI, PostGIS Compose; tools installed locally outside Git. Docker alternative not executed |
| P1-T02 native foundations | RN/Kotlin/Firebase/MapLibre/Codegen/Keystore/location FGS compile and Metro bundle succeed; full platform spike matrix remains open |
| P1-T03 contracts |64 P1/2 operations,72 schemas, generated TS/Kotlin, runtime input/output validation and drift check; [lock and corrections](../../packages/contracts/CONTRACT_LOCK.md). Full four-phase/independent G0 not claimed |
| P1-T04 identity/security | Firebase project verification, local emulator guard, phone ownership, server roles, scoped cookies/CSRF, parameterized SQL, encryption/redacted errors, retention worker; deployment DB role split/privacy erasure review deferred |
| P1-T05 CONT-01 | Contacts cap5 under lock, invitation/OTP phone match, accept/decline/block/reopen/withdraw, independent temporary contact-GPS sessions, device registration APIs; contact never becomes a public nearby responder |
| P1-T06 SOS-01/02/03/04/07 | Atomic event/recipients/grants/outbox, immutable UUID retry key, tombstone-before-late-create, noGPS/no-recipient acceptance, owner history, resolve/cancel,24h expiry; no route/media call in initial transaction |
| P1-T07/T08 delivery/ACK | DB leases, attempted-before-send, fake provider idempotency, bounded retries, signed fake receipts, ACK/ETA, durable30s primary promotion and expiration; real delivery and extensive kill/failure matrix unvalidated |
| P1-T09 browser response | Fragment exchange with120s same-exchange recovery, grant-specific HttpOnly session/CSRF, scoped projection, acknowledgement, directions and revocation. Reissue/revoke API present; owner reissue UI still open |
| P1-T10/T11/T13 mobile | Native encrypted account-bound journal/transport,5min bounded retry/reconfirmation, reboot/wall/monotonic guards, stop/termination reconciliation, phone auth, contacts/SOS/history screens,112 dialer, purpose-bounded location service. Two mocked UI tests; device lifecycle tests still open |
| P1-T12 provider configuration | **MOCK_ONLY** SMS/push and emulator auth; [provider register](provider-register.md). No real credentials or live egress adapter |
| P1-T14/T15 integration/gate | Local critical/browser tests executed; no independent review, physical phone result or load benchmark. Gate remains PARTIAL |

Implementation is in `services/api/src/modules/`, `services/worker/src/index.ts`, `apps/responder-web/src/`, `apps/mobile/src/`, `apps/mobile/android/app/src/main/java/com/surakshaai/` and migrations001–006. Phase2 adds007–009/009a. See [run instructions](../../RUNNING.md).

## Executed checks

Environment:Windows, Node26.13.0/npm11.20.0, PostgreSQL17.11/PostGIS3.6.2, Firebase Auth emulator, Chromium, JDK17/AndroidSDK36. API integration tests inject an identity verifier; browser tests use real Firebase emulated phone OTP. No physical device was attached.

| Command | Result / evidence boundary |
|---|---|
| `npm run contracts:check` | Deterministic generated artifacts match canonical hash |
| `npm run typecheck` | Backend/contracts/tests, strict Next web and mobile pass |
| `npm run lint` | Backend/web/contracts/scripts/tests pass |
| `npm test` | **15 passed**,0 failed/0 skipped; includes actual PostGIS and synthetic scoring;2132ms observed suite run, not a latency benchmark |
| `npm run test:mobile` | **2 passed**; phone/dialer before auth and pending SOS truthfulness; native mocked |
| `npm run test:web` | **2 passed** in Chromium: emulated phone→SOS→fake recipient inbox→tracking→ACK→resolve/revoke; route comparison→journey→arrival |
| `npm run build` | Type checks and Next16 production build pass; seven app routes generated |
| Android `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a` | Success, actual APK generated; no launched-device claim |
| Metro `bundle --platform android --dev false` | Success,22 assets bundled; no runtime UI claim |

Meaningful API checks cover concurrent duplicate SOS, body mismatch, late create after termination, cross-owner denial, accepted≠delivered, exchange replay/forwarding, CSRF, revoke, contact-cap race, optional consented GPS privacy, durable journey duplicate scheduling, coarse moderated reports, shop closure precedence and retained journey contract validity. These do not cover every matrix row in [testing gates](../TESTING_AND_ACCEPTANCE_GATES.md).

## Pending acceptance and known limits

- Independent contract/privacy/security review and comprehensive fault injection: actual worker death at each send boundary, ambiguous provider reconciliation, multiple workers, lost native responses, process death, account switching, clock/reboot tests and24h expiry observations.
- Physical API29/33/34/36 phones: permissions/coarse accuracy, screen-off/OEM limits, foreground service, offline stop/recovery,16KB load, battery/CPU, TalkBack/font scale and Hindi review. Native accepted state uses periodic reconciliation while alive; background survival is not guaranteed.
- Full owner grant-reissue UI, richer observability/latency/load measurements, deployment least-privilege roles, privacy deletion/export workflows and hosted backup/restore/release signing remain delivery hardening work. Signed release is not available.
- Dependency audit after safe patches/`@grpc/grpc-js` override: **0 high/critical,9 low/19 moderate** in the full tree at inspection. Toolchain advisories remain; do not force an incompatible major downgrade. Firebase CLI's unused hosting dependency `superstatic@10` declares Node20/22/24, causing an engine warning under Node26; Auth emulator/browser tests nevertheless executed successfully. The optional Auth container uses Node24. Re-audit compatibility during Phase4.
- GitHub CI is supplied but a remote CI pass cannot be inferred from local results.

Rollback: preserve applied checksum migrations, root lockfile, `.env` and DB volume. Roll application artifacts back compatibly; never undo tombstones or blindly replay attempted outbox rows. Recovery/next tasks are recorded locally in ignored execution state. Next product implementation is Phase3 only after a bounded review of these open gates; Phase4 owns final delivery testing. No AI/duress/global key feature or low-battery broadcast is enabled here.
