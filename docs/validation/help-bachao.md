# Help/Bachao prototype implementation — 11 November 2026

Phase:3/4 continuation, CR-005. User explicitly requires Help/Bachao now; production deployment remains deferred. **Offline word recognition is implemented and packaged for phone testing.** No zero-bug, human-accuracy or physical-device pass is claimed.

Completed:

- Bundled original Apache-2.0 Vosk small English0.15/Hindi0.22 archives with source attribution, archive/per-file SHA256 and explicit Gradle asset allowlists. Both required words exist in the actual model vocabularies. Android Vosk0.3.75/JNA5.18.1 pins follow the upstream Android demo. Fresh setup/build requires no model-service account or download at runtime.
- Native `OfflinePhraseRecognizer` verifies/caches public weights before microphone capture, then processes each fresh PCM chunk exactly once in both languages. It shares the existing AudioRecord/YAMNet stream rather than opening a second microphone. Only finalized exact help/बचाओ words with finite confidence≥0.75 and0.08–3s timing qualify. Bounded15s decoder state; no retained/uploaded transcript or raw recording. Confidence is an engineering filter, not measured distress probability.
- Help/Bachao check-ins work without motion and share the120s sound cooldown. Distinct HELP_CHECK_IN/BACHAO_CHECK_IN messages identify the word. No automatic SOS; existing manual activation is unchanged and never waits for models, media or routing.
- Controls show explicit phrase consent and actual LOADING/ACTIVE/UNAVAILABLE/STOPPED state, last target and manual confirmation/dismiss. Turning consent off stops monitoring. Pending permission/server requests are cancelled by generation tokens; a late reply cannot silently start capture after withdrawal. Stop works offline and remains available while starting. Common buttons now expose disabled state to accessibility services.
- Native shutdown is idempotent, releases both models/recognizers/PCM and keeps the old service unavailable for a new start until destruction, avoiding reuse during teardown. Permission/account/expiry/notification/audio-conflict behavior remains bounded and visible. Startup/runtime/memory failures degrade/stop rather than falsely claiming an active recognizer.
- Final native state review corrected two motion-fallback error paths: a stale audio error no longer masks an active motion-only session, and failed accelerometer registration resets the session rather than leaving an apparently active status.
- Reproducible desktop inference check against10 explicitly generated public test fixtures; none are participant recordings or APK assets. Existing custom CNN training/evaluation tools remain separate optional work.

Contract changes: native JSON configuration/state only, documented in [contract lock](../../packages/contracts/CONTRACT_LOCK.md). HTTP hash remains `f92a2928a857a764c551944cd6c1037bc9ef8960fc2874a435608a55743ba8f1`; no migration or SOS trigger-policy change.

Tests/evidence:

| Check | Result |
|---|---|
| Actual desktop `ml:phrases-smoke` |10/10 generated cases passed: Help/please help me/बचाओ/मुझे बचाओ, four ordinary/nearby phrases, silence and seeded noise;32.637s generated exposure, ~1.26s desktop processing (~0.0385realtime). Not human accuracy or phone timing |
| Native `testDebugUnitTest` |12passed:5 existing fusion,7 new exact-word/invalid-confidence/timing/JSON/partial rejection/shared cooldown cases |
| `npm run test:mobile` |Expanded suite covers consent, matching Help/Bachao UI, manual-only activation, unavailable models, denial, offline Stop and pending-start withdrawal races; final result recorded below |
| `npm test` |32passed/0failed/0skipped against real isolated PostGIS, including SOS/outbox/security/privacy/media/routing/ML contracts |
| `npm run test:web` |3passed in36.9s with local Auth/API/worker/web: simulated SOS/ACK/revoke, routes/journey, evidence/withdrawal/export |
| Typecheck and lint |Passed after phrase integration; final rerun below |
| `:app:assembleDemo` |Passed; bundled arm64 demo APK with embedded JS and both language models. Final hash/checks below |
| Static APK model/license/JS/ELF checks |Both speech models and YAMNet verified; all load segments meet16KB alignment. This does not establish physical16KB execution |

The first new mobile consent test exposed missing explicit disabled accessibility state in the shared Button; this was added and tests rerun. A generated-speech setup issue was corrected by passing the portable eSpeak data directory explicitly; no failed run was counted as a recognition pass. Later consent-race fixes were rebuilt and rechecked, with results below.

Security/privacy review: executor checks; no independent acceptance is claimed. Microphone audio/words never reach server logs, storage, evidence or network. The bridge exposes only target class/score and aggregate diagnostics. Only public pretrained weights are cached; session stop clears visible word metadata. No automated tests use live microphone input, real incident data or real provider messages.

Real-device results: none unless separately recorded. The physical microphone, OEM/lifecycle behavior, voice/accent/noise recognition and energy matrix must be observed on the user's phone. One phone plus the PC responder browser suffices for a prototype rehearsal.

Known limitations: ASR can miss words or prompt on conversation/TV, and restricted grammars/confidence filters are uncalibrated. Both models add ~85.7MB compressed/~153MB extracted public weights; the APK is larger and needs free device storage. No production resources or research graduation are prerequisites for this demo. [Phone test](../PHONE_TEST.md) explains loading, pauses, cooldown and repeat demonstrations. Next prerequisite: install and run the actual phone rehearsal; fix observed failures without representing software checks as a guarantee of zero bugs.

## Final local verification

Final application code: `39218b79680f2a0c39f628bc753800fb627c2b19` (Help/Bachao integration plus motion-fallback corrections). Settled-input `assembleDemo`/`testDebugUnitTest` passed again in32s. Native12/mobile11/backend32/browser3 cases passed; no failed cases remain in those local runs. Typecheck, lint, contract drift, documentation links and repository guard passed. Next production build passed for all seven app routes plus404. YAMNet actual interpreter smoke passed again, desktop p95~1.46ms on generated signals, not phone timing.

Final local arm64 demo APK: `apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`,162,957,095bytes, SHA256 **4e15d8bc99f0fb710a474d08306d02d79fe0d031d47abe950fae18d892a34565**. APK Signature Schemev2 verification and zipalign16KB checks passed. Static verification confirms bundled JS/YAMNet/English/Hindi files and licenses, correct file hashes, no private recordings/training artifacts and16KB alignment for every native load segment, including Vosk/JNA. Debug/demo signing and USB-loopback API/Auth; not production signing. `npm run doctor` reports all PC services/config/model/APK READY and PHONE_PENDING.

Cloud verification is tracked for [phrase integration](https://github.com/sajal-sonker/women-safety-app/actions/runs/43048545259) and [final fallback correction](https://github.com/sajal-sonker/women-safety-app/actions/runs/43049798411). Local results above are distinct from those remote jobs; their final outcome is recorded below when available.

Cloud outcome: the final `39218b7` run passed **all three jobs**: application (including11 mobile tests), ML toolchain (including actual generated phrase inference on Linux), and Android build/native tests/static APK verification. Subsequent test-harness/report changes do not change application behavior.

## Actual Android engine execution

An isolated fresh Android API36 x86_64 emulator was booted from installed SDK resources, with host audio/cameras disabled and all temporary AVD data under ignored `.local/phrase-emulator`. The user's existing AVD data was not copied or modified. `PhraseSmokeInstrumentation` was built and installed in a separate test APK; generated fixtures are test-only assets, explicitly excluded from the application APK.

The emulator reported API36/x86_64 with4096byte kernel pages. This is not a16KB runtime test. Initial emulator bootstrap attempts hit a missing initial-data image/command-line AVD manager; a separate fresh local AVD configuration resolved setup, then the actual test passed. These setup failures are not counted as test passes. The test emulator was shut down afterwards.

Actual instrumentation result: **PASS_ANDROID_GENERATED_SPEECH_ONLY,10/10 cases passed**. Both English/Hindi Vosk/JNA recognizers loaded and processed the generated PCM correctly on Android; LiteRT/YAMNet inference was also exercised in the same process. Expected HELP/BACHAO labels matched all four generated positives, and all six generated negatives yielded no keyword labels. The instrumentation did not create an AudioRecord, request microphone permissions, authenticate an account or invoke SOS/network transports. This adds Android SDK/JNI execution evidence beyond the desktop smoke and pure Kotlin unit tests; it is not a real-voice/microphone/lifecycle/physical-phone result.

Reproduce with an Android device/emulator and matching ABI: build `:app:assembleDebug :app:assembleDebugAndroidTest -PreactNativeArchitectures=<ABI>`, install `app-debug.apk` and `app-debug-androidTest.apk` (the latter with `adb install -t`), then run `adb shell am instrument -w com.surakshaai.test/com.surakshaai.monitoring.PhraseSmokeInstrumentation`. A successful test reports the PASS marker and `INSTRUMENTATION_CODE:-1`; an adb exit code alone is insufficient. The harness reports failures with RESULT_CANCELED. Future CI also compiles this instrumentation APK; it does not claim to run an emulator unless separately recorded.

After adding the separate test harness, the final arm64 demo and arm64 instrumentation APK were rebuilt successfully;12 native unit tests passed again. The demo APK hash remained **4e15d8bc99f0fb710a474d08306d02d79fe0d031d47abe950fae18d892a34565**, confirming the test-only assets/harness did not change the delivered application. Updated static checks also reject generated speech files in the app APK. Cloud SUCCESS above refers to application code39218b7; the subsequent harness/verification commit is tested locally and does not claim a separate cloud run.
