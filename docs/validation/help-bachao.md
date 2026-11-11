# Help/Bachao prototype implementation — 11 November 2026

Phase:3/4 continuation, CR-005. User explicitly requires Help/Bachao now; production deployment remains deferred. **Offline word recognition is implemented and packaged for phone testing.** No zero-bug, human-accuracy or physical-device pass is claimed.

Completed:

- Bundled original Apache-2.0 Vosk small English0.15/Hindi0.22 archives with source attribution, archive/per-file SHA256 and explicit Gradle asset allowlists. Both required words exist in the actual model vocabularies. Android Vosk0.3.75/JNA5.18.1 pins follow the upstream Android demo. Fresh setup/build requires no model-service account or download at runtime.
- Native `OfflinePhraseRecognizer` verifies/caches public weights before microphone capture, then processes each fresh PCM chunk exactly once in both languages. It shares the existing AudioRecord/YAMNet stream rather than opening a second microphone. Only finalized exact help/बचाओ words with finite confidence≥0.75 and0.08–3s timing qualify. Bounded15s decoder state; no retained/uploaded transcript or raw recording. Confidence is an engineering filter, not measured distress probability.
- Help/Bachao check-ins work without motion and share the120s sound cooldown. Distinct HELP_CHECK_IN/BACHAO_CHECK_IN messages identify the word. No automatic SOS; existing manual activation is unchanged and never waits for models, media or routing.
- Controls show explicit phrase consent and actual LOADING/ACTIVE/UNAVAILABLE/STOPPED state, last target and manual confirmation/dismiss. Turning consent off stops monitoring. Pending permission/server requests are cancelled by generation tokens; a late reply cannot silently start capture after withdrawal. Stop works offline and remains available while starting. Common buttons now expose disabled state to accessibility services.
- Native shutdown is idempotent, releases both models/recognizers/PCM and keeps the old service unavailable for a new start until destruction, avoiding reuse during teardown. Permission/account/expiry/notification/audio-conflict behavior remains bounded and visible. Startup/runtime/memory failures degrade/stop rather than falsely claiming an active recognizer.
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
