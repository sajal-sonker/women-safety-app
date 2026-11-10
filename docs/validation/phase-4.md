# Phase 4 — controlled-demo hardening and delivery evidence

Date:10 November2026. Application baseline6237a1e, additive migrations010/011 and CR-003. **Overall PARTIAL; G4 NOT_ACCEPTED. No PASS_PILOT or independent PASS_CONTROLLED_DEMO is claimed.** Application work targets main; agent context stays excluded from main.

| Task | Implemented / remaining |
|---|---|
| P4-T01 | Negative authorization/media/CSRF inherited and expanded regressions, dependency audit/remediation. Audit after sharp0.35.5:0critical/0high/19moderate/9low; remaining advisories need independent triage. Full penetration/native review open |
| P4-T02 |011 privacy jobs, verified recent-auth export/delete, encrypted24h export, explicit active-sharing resolution, immediate disable/revocation, resumable transactional purge, minimized identity tombstone, external encrypted erasure ledger, deletion-status recovery, mobile/web controls. Actual pg_dump/pg_restore rehearsal plus restore re-purge regression. Managed backup retention/policy independent review open |
| P4-T03 | **BLOCKED_EXTERNAL** real auth/SMS/permitted push/host/storage/scanner/region/budgets. Fake defaults remain enforced; no provider success invented |
| P4-T04 | **BLOCKED_EXTERNAL** two physical phones,16KB/runtime, lifecycle/accessibility/battery, real-call/key/PIN observations and production signing key. Android compile/demo APK outcome below; a build is not a physical pass |
| P4-T05 | Isolated local burst500creates/concurrency10/100owner polls:0errors, p50~17ms/p95~30ms, ~11.6s (five verified fictional contacts per owner). Not a30min staging/10creates-per-minute/location freshness benchmark. Repeatable soak command supplied; device energy and dated actual tariffs NOT_MEASURED |
| P4-T06 | Encrypted local backup/checksum, separate erasure ledger, actual isolated restore/reconciliation, additive rollback instructions, graceful existing API/worker shutdown. Private cloud deployment, DB role separation, TLS ingress, managed WAL/RPO/RTO, alerting/rotation drills remain open |
| P4-T07 | Existing intent/idempotency/termination/worker tests plus evidence/privacy negative campaign; full outage/native/real-provider recovery matrix remains open |
| P4-T08 | Updated setup, advanced feature limits, support/model cards and [operations](../../infra/OPERATIONS.md). No unverified competitor/police/safety/delivery claims added |
| P4-T09 | Reconstructed local Node26.13/npm11.20/PostgreSQL17/PostGIS3.6.2/Auth emulator, migrated/seeded demo, built web, reran critical flows. Native artifact/rehearsal results below. Fresh hosted release, independently observed device rehearsal incomplete |
| P4-T10 | **BLOCKED_EXTERNAL** independent reviewer; final gate not self-approved |

## Executed checks

| Command | Result / mode |
|---|---|
| `npm ci` | Passed; exact lockfile, local checksum-verified Node26.13.0/npm11.20.0. Firebase emulator tooling warns that a transitive package supports Node20/22/24 |
| `npm run db:migrate` |001–011 applied to new isolated local PostGIS; pre-existing migration files unchanged |
| `npm test` |22 passed at advanced checkpoint; actual PostGIS plus media/statistics tests,0failed/skipped. Additional final cases below |
| `npm run test:mobile` |4 passed, native mocked; decoy/simulation/manual truthfulness/dialer |
| `npm run typecheck`, `npm run lint` | Passed at advanced integration checkpoint |
| `npm run build` | Next16 production build passed; seven application routes plus404; one intermediate TrackingView/JourneyTracking union error fixed and rerun passed |
| `npm run backup:create` | Actual pg_dump encrypted with AES-GCM and SHA256; private ignored archive |
| `npm run restore:verify -- <archive>` | Actual pg_restore into **suraksha_restore_test**, latest ledger merged, erasure reconciled; checksum verified. Empty app ledger in this clean demo; nonempty erasure restore is separately exercised by API regression |
| `npm run test:load` | LOCAL_BURST_500 measured above; target p95<3s met for this local burst only |
| `npm audit --json` | Exit1 due low/moderate findings;0high/critical after remediation; not called a clean audit |
| `npm run ml:evaluate` | Expected exit2 without private dataset/model; BLOCKED_EXTERNAL, not a test pass |

Final addendum: `npm run test:security` passed18 cases including two-worker expired leases and unknown-provider retry suppression; `npm run test:web` passed3 Chromium/Auth-emulator flows (SOS/ACK/revoke, route/journey, evidence/withdrawal/export). Mobile components passed4. Web visual checks at390px/1440px found no page errors or horizontal overflow and were visually inspected. `npm run build` passed again with the final contract and patched image library. CycloneDX SBOM generated privately; audit remains0high/critical,19moderate/9low. Direct ML evaluator exited2 as designed; npm may normalize failed script exit codes. All tests use synthetic accounts/locations and fake providers; no emergency calls or real messages. No signed production release key was supplied. Debug/demo signing is never production signing.

Security/privacy review: executor checks only; no independent sign-off. Export excludes contact GPS, tokens and raw media; deletion purges own event/location/context/destination/evaluations/evidence/outbox/export and local account data after confirmed completion. Other owners retain revoked relationship stubs, scrubbed of the deleted principal's phone/name. Provider residual copies and externally copied/downloaded media cannot be recalled.

Known limitations: the local fake adapter stores encrypted media in PostgreSQL rather than a real private bucket/scanner. MP4/geocoder/shop delivery/audio AI remain disabled. Latest ledger must survive DB restores; protected off-volume storage, crash/WAL recovery, automated30day archive expiry and production key separation are operator prerequisites. Local restore does not establish RPO15min/RTO60min. Independent G0–G4, physical/native/source/provider gates remain open.

Next prerequisites: independent review, consented model data/model artifacts, two Android phones, live-provider/hosting/storage/scanner decisions and credentials/budgets, signing key and field-source validation. Continue only the affected blocked rows when resources exist; manual SOS remains independent.

Android build addendum: the first settled packaging attempt failed because the hoisted Hermes compiler was not found by the template default. `react.hermesCommand` now resolves the platform binary from hermes-compiler. The subsequent arm64 `:app:assembleDemo :app:compileDebugKotlin` passed, producing a bundled demo-signed APK. The compiler exposed a pre-existing signed-out/null-journal state comparison bug; the intent and PIN-state reader now require a nonnull record and principal. Final incremental rebuild/checksum follows below. Local Java21 was available and used for this build; CI continues to pin Java17, whose run is not claimed as local evidence. NDK27.1.12297006/CMake3.22.1/SDK36 were installed. Deprecation warnings remain. No device was attached.

Final verification: full `npm test` **24passed/0failed/0skipped**; lint, contract drift and documentation links passed. The final Android incremental rebuild passed in39s after the null-state fix. Demo APK `apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`, SHA256 **9076ad5ab889063c630e066beff858f3ea51ff4244059774cdc7e146feb56265**, APK Signature Schemev2 verification passed, bundled JavaScript present. This is a controlled local demo signed with the local debug key, not a production release key. Repository guard confirms no agent-context or credential files are staged on main. Remote CI status is not certified by these local results.
