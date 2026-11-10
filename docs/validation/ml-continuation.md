# ML/software continuation - 10 November 2026

**Final tooling correction:** see the [latest local report](final-local-work.md). The earlier synthetic candidate export could produce invalid numbers, so its argmax-only parity result is withdrawn as valid inference evidence. Explicitly frozen variables and finite-output checks now pass actual end-to-end inference/calibration/scoring. The bundled YAMNet model is unaffected. Validation controls export parity; test inference now requires a separate validation freeze artifact.

Phase:3/4 continuation, CR-004. Scope: finish dependency-ready software and deliver a controlled phone-test build; user performs physical testing. **Ready for controlled phone testing; independent/physical/live acceptance remains PARTIAL.**

Completed:

- Bundled Google YAMNet/classification v1, Apache-2.0 license/attribution, explicit asset allowlist, hash/tensor/label validation and standalone CPU Interpreter. Model SHA256 `10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de`,4,126,810bytes, raw15600float32 samples at16kHz,1x521scores. Upstream source and limitations are in [model card](../../ml/MODEL_CARD.md).
- Native typed microphone foreground service, explicit audio/motion consent, notification Stop, monotonic expiry, permission/notification revocation, call/focus/silencing/account handling, non-sticky/no-boot restart, bounded in-memory overlapping audio and50Hz motion. No raw audio crosses JS or is persisted/uploaded. A microphone lease prevents concurrent evidence audio. Separate SOS/journey GPS purposes remain independent.
- Pure native audio/motion confirmation reducer: strong audio does not require motion; lower audio requires motion within3s;120s prompt cooldown. Check-in/dismiss/manual SOS UI and aggregate model/latency/PSS diagnostics. No automatic sensor dispatch or Hindi/English word-recognition claim.
- Real private-data four-class CNN training, seeded/streamed data loading, validation-only early stopping, waveform-input LiteRT export with embedded log-mel preprocessing, dynamic weight quantization and held-out float/quantized parity. Synthetic toolchain candidate stays ignored and never enters the app.
- Event-level evaluator with exact held-out identity coverage, pre-test threshold freeze, episode/cooldown handling, class errors/misses, precision/recall/support/Wilson lower bounds, strata/delay quantiles and Poisson false-alarm upper bounds. Actual WAV byte format/duration is checked so declared metadata cannot fabricate negative exposure. Dataset minima and device/independent review remain required.
- Phone-specific bundled demo, [USB setup script](../../scripts/phone-test.ps1) and [device test guide](../PHONE_TEST.md). Backup creation prunes only generated encrypted archive names at30days, with absolute path bounds and tests; operator/off-site policy remains separate.

Contract changes: HTTP schemas/paths/hash unchanged (`f92a2928a857a764c551944cd6c1037bc9ef8960fc2874a435608a55743ba8f1`). Native monitoring accepts CONFIRMATION_ONLY with explicit session consent and adds dismissMonitoringCheckIn. Local monitoring capability represents available software only. Automatic ML_FUSION server creation remains disabled. Runtime is pinned to maintained LiteRT Interpreter1.4.2 because2.3.2 requires Kotlin2.4 metadata incompatible with this RN/Kotlin2.2 template; no unreviewed toolchain upgrade was forced.

Tests observed:

| Command/check | Actual result / boundary |
|---|---|
| `npm run ml:verify` | Hash/TFLite header/521labels verified |
| `npm run ml:smoke` | Actual LiteRT CPU inference on generated silence/tone/noise, valid tensors/finite scores; desktop p95~1.3ms in this run. Not phone timing or distress recall |
| `npm run ml:training-smoke` with training environment | Actual one-epoch synthetic training/export/interpreter execution passed;30,512byte candidate,8generated held-out windows,1.0float/quantized decision agreement. **No phrase/detector accuracy evidence**, candidate marked SYNTHETIC_TOOLCHAIN_TEST_ONLY and excluded from APK |
| Android `:app:testDebugUnitTest` |5native fusion tests,0failures/errors/skips |
| `npm test` |28passed/0failed/0skipped, real PostGIS plus contract/media/ML/statistics/retention/exposure checks |
| `npm run test:mobile` |4passed, native mocked |
| `npm run test:web` |3Chromium/Auth-emulator flows passed after integration |
| `npm run typecheck`, `npm run lint`, `npm run build` | Passed |
| `npm run backup:create` | Actual encrypted pg_dump passed;0expired files in this fresh folder; retention boundary tests passed |
| APK static inspection | Bundled model/license/JS present, no private data assets, all included ELF load-segment alignments≥16KB; runtime still NOT_TESTED |

One attempted native unit task did not exist (`testDemoUnitTest`); actual `testDebugUnitTest` was used. The incompatible LiteRT2.3.2 build failed and was replaced with1.4.2, then native compile/tests/demo packaging passed. These failures are not counted as passes. Final artifact/soak addendum follows after completion.

Completed30minute local synthetic soak:399creates (100initial,10/min thereafter),five fictional verified contacts per owner,100active-event target maintained,17,800owner polls,0errors; p50 persistence/queue11.4ms, p95 29.9ms, elapsed1800.4s. Identity is injected and delivery fake. This does not certify physical latency, external provider receipts, browser/location freshness or full staging/operations acceptance. Native model/call/permission tests are still assigned to the user.

Final software artifact: phone-specific arm64 `:app:assembleDemo :app:testDebugUnitTest -PapiBaseUrl=http://127.0.0.1:4001` passed after final consent/notification-channel handling. APK SHA256 **fed159996148f4f055b56a9c5173737efcb309c0277518239153fa4d707aba14**, debug/demo signed, bundled model/license/JavaScript verified, APK signature and16KB zip/ELF alignment checks passed. The artifact remains ignored at `apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`. Native5, backend28, mobile4 and browser3 tests passed; final lint/type checks (including all ML/operations TS), model integrity, schema drift and documentation links passed. No physical test or independent safety acceptance is inferred.

Consent recovery detail: local sign-out/deletion stops microphone immediately before server-job polling. Connected native sessions poll consent and stop on withdrawal/account disablement. During an outage, remote changes cannot be confirmed; existing explicit local sessions remain bounded by monotonic expiry and notification Stop, with unconfirmed status exposed. Both global notification denial and a disabled monitoring notification channel prevent/stop capture. Independent GPS consumers are not stopped by a monitoring stop.

Real-device results: NOT_RUN by executor; user will record model/OS/API/permissions/observations using the phone guide. Static alignment is not a16KB emulator/phone lifecycle pass. No physical accuracy, battery, screen-off reliability or independent acceptance is claimed.

Security/privacy review: executor only. No hidden capture, persisted ambient audio, automatic SOS or model/network dependency in initial SOS. Monitoring/evidence use explicit separate consent and mutual microphone ownership. Artifacts package only an explicit public model/license allowlist; private recordings/candidates/caches remain excluded. Tests/fake providers never dial112 or send real emergency messages.

Known blockers: licensed consented Hindi/English participant dataset and real held-out predictions, two-phone/native/energy matrix, real permitted providers and private storage/scanner/hosting/signing resources, shop agreements, geographic field sources, independent reviewer and production operations. A pretrained sound model does not satisfy phrase-model graduation. These rows remain external rather than fabricated completed work. Next prerequisites: user phone results and the relevant resources before enabling affected live/automatic features.
