# Current ML/phone-test checkpoint - 10 November 2026

Application main **b0bc9c5fbed313d28f1bf44dbe640454489dbd02** is pushed. User authorized finishing remaining ML/software before personally testing the phone. Context remains on handoff/agent-context only; no agent files/private recordings/credentials entered main. This section supersedes older statements that no model/runtime is bundled.

Completed CR-004: licensed Apache-2.0 Google YAMNet TFLite sound baseline (SHA25610c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de,4,126,810bytes,15600float32 input/1x521output), explicit model/license asset allowlist and integrity checks; native microphone foreground service/audio-motion confirmation reducer; notification Stop/expiry/revoke/call/silencing/account handling; microphone lease separate from evidence; check-in/manual SOS UI and bounded aggregate diagnostics. Automatic sensor dispatch remains disabled, strong audio does not require motion, no raw microphone buffers cross JS or persist/upload. Local sign-out/deletion stops capture before job polling. Connected consent changes are checked; offline explicit sessions expire locally and expose unconfirmed remote consent. Global notification/channel denial prevents/stops monitoring.

Implemented and executed private-data four-class training/export tools, actual synthetic one-epoch toolchain training and TFLite export/interpreter parity, and actual bundled-model desktop smoke inference. The generated candidate is test-only under ignored .local, not the model bundled in the app. Generic YAMNet does not recognize Help/Bachao words or establish assault detection. Real phrase accuracy requires consented staged recordings and held-out evaluation. Event evaluator checks actual PCM duration/exposure, exact held-out IDs, frozen thresholds, episodes/class misses/confusions/strata/Wilson/Poisson bounds. No invented participant/model/device metrics.

New evidence: npm test28passed; mobile4passed; browser3passed; native fusion5passed; final lint/typecheck/build/model integrity/contracts/docs passed. TS checks now include ML and operations scripts. Model smoke p95~1.3ms on desktop generated fixtures, not phone accuracy/timing. Synthetic train/export toolchain passed with8generated windows and1.0float/quantized decision agreement, not graduation. Local30min synthetic soak:399creates,5fictional verified contacts each,100active target,17800owner polls,0errors,p50~11.4ms/p95~29.9ms,1800.4sec; fake/injected identity, no full provider/location/device gate claim. Backup creation prunes only generated encrypted archive names at30days with path bounds and boundary tests.

Final phone-specific arm64 APK uses USB loopback API127.0.0.1:4001 and emulated Auth9099, bundled JS/model/license, demo/debug signing. Path apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk (ignored), SHA256fed159996148f4f055b56a9c5173737efcb309c0277518239153fa4d707aba14. assembleDemo/testDebugUnitTest passed, signature verified, zip16KB and all ELF load-segment alignment checks passed. Physical runtime remains NOT_TESTED, assigned to user. docs/PHONE_TEST.md and scripts/phone-test.ps1 -Install explain USB mappings/install/test matrix. Maintained LiteRT Interpreter1.4.2 preserves Kotlin2.2;2.3.2 failed incompatible Kotlin2.4 metadata and was replaced, not silently forced. A nonexistent demo unit task was corrected to actual testDebugUnitTest.

Main reports: docs/validation/ml-continuation.md, ml/README.md and MODEL_CARD.md. HTTP schemas/hash unchanged f92a2928a857a764c551944cd6c1037bc9ef8960fc2874a435608a55743ba8f1 (80ops/85schemas); native seam extends confirmation-only monitoring/dismiss. Original SOS/migration invariants preserved. Independent G0-G4 remains unaccepted; missing licensed phrase data, real phone/energy/lifecycle observations, permitted live providers/storage/scanner/hosting/signing resources, shop agreements and geographic field sources are external gates. No automatic ML or live sending enabled. Next: user phone observations; fix actual failures and proceed on affected externally supplied resources without restarting scaffolding or relabelling missing gates.

Local loopback DB54329, Auth9099/UI4000, API4001, web3000 and worker were running after delivery; inspect listeners on resume. Portable Node26/npm11.20, Python3.12 runtime/training virtualenvs, JDK21/SDK36/NDK27.1/CMake3.22.1, DB/backups/newest ledger and reports are ignored/local. Secrets and participant recordings never travel in Git. Remote CI outcome not certified by local evidence.

---

# SurakshaAI continuation checkpoint � 10 November 2026

Application: main commit 4944d302b5e7ba4d64f3158ed0c0d90ac81c9ee2, pushed to origin. Context: handoff/agent-context. No handoff/agent files were merged, cherry-picked or staged on main. Main retains its strict exclusions and scripts/check-repository.mjs verifies them. This context branch retains its historical application snapshot; run/extend the current application from main, not this branch's old code.

## Current authorization and outcome

The user authorized remaining Phases3/4 implementation, black/purple UI, push application to main, keep agent context off main. One sequential executor handled backend then mobile; no subagents or independent reviewer were used. Controlled-demo additions are implemented and pushed; overall Phase3/4 and G0�G4 remain PARTIAL/unaccepted. No pilot or guaranteed safety/delivery claim.

Implemented: normal/duress scrypt/Keystore PINs and Notes/practice; native fake-call simulation/inexact reminders; default-off focused volume experiment; explicit bounded foreground motion check-in with no automatic SOS/microphone inference; private consented evidence/quarantine/recipient scopes/streams/revocation; ordered SOS context and transient responder ETA; export/delete/erasure ledger/actual local restore; black/purple mobile/web/maps; additive010/011 and CR-003. ML, real shop dispatch, MP4/real storage/scanner/geocoder remain disabled/unconfigured. Manual SOS never waits for enrichment.

Canonical main contract SHA256 f92a2928a857a764c551944cd6c1037bc9ef8960fc2874a435608a55743ba8f1:80 operations (3 binary handlers),85 schemas. Existing Phase1/2 operations/schemas semantically unchanged. Sole migration stream001�011, including009a; no applied checksum changed. Historical baseline6237a1e remains the handoff branch application snapshot only.

## Fresh verification on this PC

- Node26.13.0 checksum-verified portable runtime, npm11.20.0. Initial npm ci and subsequent exact dependency installation passed. System Node20 unchanged.
- Local isolated PostgreSQL17/PostGIS3.6.2 created from local binaries under ignored tools; system PostgreSQL service/data not modified. Root .env preserved without disclosure. Docker daemon unavailable.
- npm test:24 passed/0failed/0skipped. npm run test:security:18 passed. Actual PostGIS and media/rights/statistics tests, two-worker expired lease and UNKNOWN retry suppression.
- npm run test:mobile:4 passed, native mocked. Initial setup-load timeout recorded, then reruns passed.
- npm run test:web:3 passed with Chromium and real emulated phone OTP/fake messages: SOS/ACK/revoke; route/journey; evidence/withdrawal/export.
- npm run typecheck/lint/build/contracts:check/verify:docs passed. Browser390/1440px visually inspected,0page errors,0horizontal overflow.
- Local burst:500creates,5verified fictional contacts each,concurrency10,100owner polls,0errors,p50~17ms/p95~30ms over~11.6sec. Not the30min staging/device/provider gate.
- Encrypted pg_dump and actual pg_restore into suraksha_restore_test passed with checksum/latest-ledger merge/re-purge. Nonempty erasure reconciliation separately regression-tested. Production backup expiry/RPO/RTO not validated.
- Audit0critical/0high,19moderate/9low after sharp0.35.5 remediation. CycloneDX SBOM generated privately. Direct ML evaluator exits2 BLOCKED_EXTERNAL without private manifest/model.
- Android arm64 assembleDemo and compileDebugKotlin passed, including final39sec incremental rebuild after fixing a pre-existing signed-out/null-journal bug. First stale-input compile and first Hermes-location packaging failure were fixed and rerun. Local JDK21/SDK36/NDK27.1.12297006/CMake3.22.1; CI pins17, no local17 result claimed.
- Bundled demo-signed APK at apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk (ignored), v2 signature verified, embedded JS1521748bytes. SHA2569076ad5ab889063c630e066beff858f3ea51ff4244059774cdc7e146feb56265. Not production signing. No physical phone attached; adb devices empty.

## Required external work � not a completed release

Independent G0�G4 reviewer; two physical phones with lifecycle/TalkBack/font-scale/key/PIN/camera/audio/16KB/battery matrix; licensed consented dataset/trained LiteRT/model/parity/evaluation; real permitted provider/auth/storage/scanner/geocoder/hosting/signing resources and budgets; shop operational agreements; surveyed geographic sources; TLS/least-privilege/managed backup/rotation/rollback operations. Automatic audio/model dispatch remains disabled. Committed fake-call/PIN/evidence require native acceptance, not a relabelled experimental waiver. Full staging location/freshness/soak and fault campaign remain open.

Reports and implementation are on main: docs/validation/phase-3.md and phase-4.md, infra/OPERATIONS.md, ml/MODEL_CARD.md, apps/mobile/docs/monitoring-contract.md. Do not mark missing gates passed or restart scaffolding. Continue only dependency-ready fixes or the affected external-gate work when resources are supplied.

## Local recovery

Ignored .tools/.local contain portable Node/PostGIS, private DB data/backups/ledger and verification artifacts. Never commit them or .env. Loopback Auth9099/UI4000, API4001, web3000 and worker were running at delivery; inspect actual listeners, never trust historical process IDs. Root .env points at the newly initialized local DB. Use RUNNING.md on main. Existing event/outbox/tombstones remain authoritative; no blind send replay. Preserve newest encrypted erasure ledger outside a restored DB before serving traffic. No real emergency calls/messages were sent.
