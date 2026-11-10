# Final dependency-ready continuation — 10 November 2026

Phase:3/4. Completed software is ready for controlled phone testing. **Physical, phrase-model, independent and live-release gates remain open.** This report supersedes earlier local tooling/parity observations where stated; it does not upgrade independent acceptance.

Completed:

- CSV-to-manifest preparation with actual PCM/hash checks, explicit rights/labels/onsets and speaker/session/environment split isolation; candidate inference for the bundled sound baseline or four-class export.
- Validation-only threshold selection and a separate frozen model/dataset artifact required before test scoring. Exact test IDs, original annotations, model/manifest/freeze hashes and ordering are checked. Capture-window end times avoid look-ahead; the last stride is evaluated. Local hashes/timestamps support reproduction, not independent attestation that a person never tuned against test results.
- Fixed a real candidate export defect: the earlier concrete/resource-based Keras3 graph could return NaN probabilities. The old argmax-only parity check could incorrectly report agreement on those values. **The earlier30,512byte candidate/parity observation is withdrawn as valid inference evidence.** Explicitly freezing initialized variables before conversion fixes the reproduced failure; finite bounded probabilities and validation parity are now checked before publishing a candidate. The synthetic candidate remains private and never enters the APK.
- End-to-end generated workflow check: catalog preparation, one-epoch training/export, actual LiteRT validation inference, calibration/freeze, actual test inference and event evaluation. Small generated data must fail graduation. Added CI coverage for the same pipeline.
- Erasure recovery now merges the encrypted external ledger and reconciles users before API listen/worker processing. Ledger read/publication is serialized with a database advisory lock and a unique atomic temporary file; older snapshots cannot silently erase newer tombstones. Corrupt encrypted ledgers fail startup/publication. Tests use separate ledgers per run and exercise concurrent publication, DB rollback recovery and re-purging a restored account using the newer disk ledger.
- `npm run doctor` checks local runtime/configuration/services/model/APK and reports USB readiness without printing secrets, OTPs or device identifiers. [User checklist](../USER_CHECKLIST.md) and [ML guide](../../ml/README.md) contain concrete next steps.
- GitHub Android setup uses Ubuntu24.04's SDK with pinned packages and Java21. Both application and Android jobs passed for [e164770](https://github.com/sajal-sonker/women-safety-app/actions/runs/42866669754). The new pipeline/USB-API CI configuration is checked in the subsequent run, recorded below.

Contract changes: none to HTTP, database schema, mobile model or dispatch semantics. Automatic ML sending remains disabled. The existing black/purple UI and phone APK are unchanged by these tooling fixes.

Tests executed:

| Command | Result |
|---|---|
| `npm test` |32passed/0failed/0skipped with real isolated PostGIS; includes erasure/security and ML provenance regressions |
| `npm run test:monitoring` |8passed; annotation drift, test-set calibration rejection, freeze binding, event/exposure/statistical failures |
| `npm run typecheck`, `npm run lint`, repository guard, `git diff --check` |Passed |
| `npm run ml:training-smoke` |Passed after fixing the reproduced invalid-export failure;35,536byte private synthetic candidate,8finite validation windows, agreement1.0; no measured phrase accuracy |
| `npm run ml:workflow-smoke` |Passed real interpreter/calibration/scoring path; generated dataset correctly BLOCKED_EXTERNAL/failed graduation |
| `npm run ml:smoke` |Bundled YAMNet hash/tensors verified; finite silence/tone/noise inference; desktop p95~1.47ms, not phone performance/accuracy |
| `python scripts/check-apk.py <demo-apk>` |Bundled model/license/JS verified, no private ML assets, ELF load alignment checks pass; physical16KB runtime untested |
| `npm run doctor` |PC services/config/model/APK ready; PHONE_PENDING, no authorized device attached |
| `npm run backup:create`, `npm run restore:verify -- <encrypted-archive>` |Actual encrypted pg_dump/checksum and isolated pg_restore/ledger reconciliation passed; clean demo ledger0rows, nonempty disk recovery covered by the API regression |

Phone artifact: `apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`, SHA256 `fed159996148f4f055b56a9c5173737efcb309c0277518239153fa4d707aba14`. Bundled arm64 Android10+ local demo, debug/demo signing, USB API/Auth mapping; no Metro needed. It is not production signed. [Install/test instructions](../PHONE_TEST.md).

Real-device results: none. No device was attached; OS/permission/energy/accessibility/call/coercion outcomes are NOT_RUN.

Security/privacy review: executor tests only; no independent reviewer. No real provider messages, recordings or participant data used. Private data/artifacts stay ignored, main excludes agent context/credentials. Latest erasure ledger and encryption keys still require operator-controlled off-volume protection; local recovery tests do not establish production RPO/RTO.

Known limitations/blockers: consented/licensed phrase data and onset annotations; two phones/device measurements; live auth/delivery/storage/scanning/hosting choices and resources; validated field map/shop sources; independent gates. [Your actions](../USER_CHECKLIST.md) distinguish phone testing now from subsequent training/live launch. Next prerequisites: satisfied for local phone testing; missing for independent/live acceptance.
