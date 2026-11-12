# Phone feedback fixes — 12 November2026

Phase: 3/4 prototype corrections (ML-01/02, SOS-01/03/07, FAKE-01, PIN-01 and PRD accessibility requirements). User reports Help/Bachao app closure/“not responding,” excessive text/confusing navigation, and a receiver inbox requiring refresh. Reported phone: “moto67 power,” Android16; USB/logs unavailable. No physical-phone pass is claimed.

Completed:

- `AudioMonitoringControls.tsx`: the recognized-word label previously used `accessibilityRole="status"`. React Native0.88 Android's legacy accessibility-role setter rejects this value with `IllegalArgumentException`, even though its shared TypeScript type accepts it. The label is first rendered after recognition, explaining a concrete crash path. It now uses the supported polite live region. Native instrumentation deliberately reproduces the old setter exception and verifies safe labels for both Help and Bachao.
- `AudioMonitoringService.kt`: removed `Debug.getPss()` from the500ms main/notification publishing loop. Memory sampling now runs on the inference worker at most once per minute. No model inference runs on the UI thread. This addresses an ANR risk, without claiming the unobserved physical ANR has been conclusively diagnosed.
- `NativeSafetyModule.kt`: local state, manual SOS activation and monitoring Start/Stop/dismiss use a separate local executor so slow network work cannot occupy their queue. Instrumentation blocks all three network-worker threads and verifies local state and Stop still finish within2seconds.
- `App.tsx`, `components.tsx`, discreet/evidence/voice controls: four tabs (Home, Journey, Contacts, More); one optional tool per More page; Android Back returns to More. Main SOS/check-in actions stay visible. Diagnostics, route inputs, evidence and lengthy explanations are expandable. Consent, simulated-delivery status, manual-only voice confirmation and duress warnings remain explicit. Fictional help points consistently use the labelled sample Lucknow area. Account changes clear owner data. Journey creation remains visible even if optional location startup fails.
- Phone sign-in resets verification fields across account changes and offers Change number or resend after a failed/expired code. The phone number stays fixed while verifying that code. A regression covers retry, successful login and sign-out returning to a fresh code-request form.
- `useLiveRefresh.ts`, Dashboard and tracking: recipients now poll while signed in even when they own no active SOS/journey. Sequential foreground1.5second request batches,8second cancellation, offline/hidden pause, focus/online resume, capped12second error backoff and Retry now. Inbox renamed Received alerts. Identity/grant guards prevent delayed prior-session responses from appearing after account changes; tracking revocation and evidence authorization remain enforced.
- `MainApplication.kt`: explicitly passes application `BuildConfig.DEBUG` to React host developer support; debug builds can load Metro instead of requesting absent embedded assets. Demo builds retain embedded JavaScript and disabled dev support.

Contract changes: no HTTP/schema/hash/migration changes. Shared client accepts an optional AbortSignal; native JSON and dispatch/consent policies are unchanged. See CR-006 in [contract lock](../../packages/contracts/CONTRACT_LOCK.md).

Tests:

| Check | Result |
|---|---|
| `npm test` |32passed/0failed/0skipped, isolated real PostGIS; API/privacy/media/ML/routing regressions |
| `npm run test:mobile` |14passed; phone-code retry/sign-out, four-tab/tool navigation, safe recognized-word rendering, consent cancellation/offline Stop, truthful local SOS status |
| `npm run test:web` |6passed; recipient waits before SOS and receives it without reload; ACK/revocation, routes/journey, evidence/export, network failure and offline recovery, slow requests with no overlap, delayed response cannot cross accounts |
| Typecheck/lint |Passed after final source changes |
| Android native unit tests |12passed; final arm64 `:app:testDebugUnitTest` |
| Actual Android API36/x86_64 instrumentation |PASS_ANDROID_GENERATED_SPEECH_ONLY;10/10 generated speech/nearby-word/silence/noise cases, LiteRT+Vosk in one process, old rendering exception reproduced/safe label verified, blocked-network local controls verified |
| Android visual review |Fresh debug build loaded via Metro; fake Auth owner login and Home/More/Voice/Fake call/PIN/fictional shops inspected. No microphone, calls or SOS activated in this review |
| `:app:assembleDemo` |Passed with arm64-v8a, USB-loopback API, embedded JS and models |
| APK checks |Model/license/hash/JS/test-fixture exclusion and all ELF16KB alignments passed; APK Signature Schemev2 verified and zipalign16KB passed |

Final local APK: `apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`,162,961,891bytes; SHA256 **b07f3edc10aa94f4adb5c0de8ea01d63d23ae1d774a853067dcc7858360f207a**. This supersedes the older APK hash in the historical phrase report and the initial phone-fix build. Debug/demo signing; no production deployment. Final auth/UI adjustment was rebuilt and rechecked for signature, zip/ELF alignment, bundled models and embedded JS.

Intermediate build issues were corrected before final passes: memory-sample Kotlin type uses Long, and instrumentation uses concrete BridgeReactContext because ReactApplicationContext is abstract in this SDK. An automation input-label selection issue was corrected before the successful visual login. Failed attempts are not counted as passes.

Real-device results: not tested by executor. The emulator uses API36/Android16 with4096byte pages and generated audio fixtures; it does not establish physical16KB execution, Moto OEM behavior, microphone lifecycle, human accent/noise accuracy, battery consumption or absence of all ANRs.

Security/privacy review: executor checks only. No real emergency sends/calls/live microphone recordings in automation. Recognition never dispatches SOS automatically; public weights remain local, audio/transcripts are not persisted/uploaded. No credentials, agent context, private data, build outputs or generated speech fixtures enter the application commit/APK. Local fake provider and fictional shops remain clearly labelled.

Known limitations/blockers: physical Moto retest is pending; no claim of zero bugs or independent production acceptance. Browser polling requires an open signed-in online page and does not provide closed-browser push. ASR remains an uncalibrated pretrained recognizer that can miss or falsely recognize speech. Deployment is deferred by user scope.

Next prerequisites: install the updated APK and follow [phone test](../PHONE_TEST.md). Test Help then stop/restart or wait120seconds before Bachao, confirm check-in labels render without closing, leave listening active briefly, verify Stop releases the microphone, and keep Received alerts open before a simulated SOS. Record any remaining error with its time and loading/listening stage.

Cloud status at reporting: [core correction run](https://github.com/sajal-sonker/women-safety-app/actions/runs/43178107545) passed application and ML jobs; Android was still running. The [final phone-login correction run](https://github.com/sajal-sonker/women-safety-app/actions/runs/43178997366) was still running. No final cloud success is claimed here; the completed local build/test results above stand separately. Final application source commit: `2592d6c1382b13a6d6739f97f14b4c9e95e8f440`.
