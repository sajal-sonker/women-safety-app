# 17 — Architecture decisions, assumptions and unresolved questions

## Decision record (approved design direction from conversation)

CR-005 / 10 November2026: finish feasible local work and give the user a concrete ownership checklist. Serialize erasure-ledger publication and merge/re-purge before API/worker start; preserve newer disk tombstones across older DB restores and fail closed on an unreadable ledger. Isolate test ledgers per run. Complete ML candidate scoring/validation-only threshold freeze. GitHub's application job for b0bc9c5 passed; Android failed at setup-android before compiling. Replace that dependency with the official runner SDK, pin Ubuntu24.04/Java21 (locally verified), and record actual remote results. No schema change, live-provider choice, deployment/spending or physical acceptance implied.

Continuation 10 November 2026 / CR-004: user requested finishing remaining ML/software before personally testing a phone. Implement a bundled, checksum-pinned Apache-2.0 Google YAMNet classification baseline (raw16kHz waveform15600 samples; output1x521), native opt-in microphone foreground service, bounded audio/motion confirmation-only fusion, lifecycle/diagnostic controls, and real training/evaluation tooling. Generic sound-event classification does not recognize Hindi/English words or establish assault detection. Those custom classes require licensed participant recordings and held-out evaluation. Automatic sensor dispatch stays disabled; manual SOS is independent. Device evaluation is assigned to the user; no device pass or independent gate is inferred. No live providers, shop agreement, production credentials or cloud spend is invented. Main receives product code/model/license/reports; context stays on the handoff branch.

| ADR | Status | Decision | Rationale / consequences |
|---|---|---|---|
| ADR-001 | Baseline | Android-first React Native + TS; Kotlin native for sensors | team comfortable with React; OS-dependent features require native validation |
| ADR-002 | Baseline | Node.js/Express + TS, PostgreSQL/PostGIS, Next.js web | clear geospatial ownership, shared types, credible full-stack engineering |
| ADR-003 | Confirmed | Priority responder chosen **only from user's configured trusted emergency contacts** | no random nearby users; contact GPS requires separate explicit consent |
| ADR-004 | Confirmed | Device monitoring is opt-in for unsafe situations/journeys, not 24/7 | battery/privacy and OS restrictions; manual SOS always works |
| ADR-005 | Confirmed | Low-battery automatic location broadcast is **excluded** | latest faculty comment made it optional; team chooses to skip |
| ADR-006 | Confirmed | Fake PIN included; volume-key code feasibility-gated | professor suggested Fake PIN alongside team volume-code concept; global key capture not assumed |
| ADR-007 | Baseline | Time-aware route indicators with confidence and explanation | aligns faculty request; avoids unsupported guaranteed-safety narrative |
| ADR-008 | Proposed | Initial **basic** SOS to all registered contacts, prioritized **contextual** alert to nearest eligible; escalate if no acknowledgement | resilience; clarify product choice if team prefers primary-only delivery |
| ADR-009 | Proposed | PostgreSQL transactional outbox; mock providers before live setup | durable alerts with fewer external moving parts |
| ADR-010 | Proposed | SMS via authorized provider; no device `SEND_SMS` in first version | avoids assuming Play-store SMS permission entitlement or offline provider fallback |
| ADR-011 | Proposed | Shop network by consented owner application, moderated approval | no automatic alert to any OSM shop |
| ADR-012 | Proposed | No implicit police dispatch; native 112 call action only | no verified emergency-service integration agreement |
| ADR-013 | Proposed | 4 execution phases with joint contract gate | supports agentic implementation and testing without many fragmented phases |

**Source distinction:** `Confirmed` reflects explicit user/team instructions; `Proposed` and `Baseline` are engineering defaults to review. Do not misrepresent a proposed setting as already approved by professor/team.

## Open questions to close during contract gate (do not block writing docs)

Review-1.2 disposition: D18–D39 in [TECHNICAL_RISKS_AND_DECISIONS.md](TECHNICAL_RISKS_AND_DECISIONS.md) finalize engineering defaults for implementation. The historical Proposed rows below record their origin, not a request to ask the team again. OQ03/04/08/10/11/13/14 have documented defaults and bounded implementations; OQ01 is nonblocking branding. OQ02/05/06/07/09/12/15 contain external resources/permissions/device/data prerequisites; block only affected validation/live scope, not local fake-mode work. A changed product/consent decision still requires explicit review.

| ID | Question | Safe provisional default | Who decides |
|---|---|---|---|
| OQ-01 | Product name and brand? | SurakshaAI working name | team |
| OQ-02 | City/region for geospatial pilot? | bounded India pilot, undecided | team + data owner |
| OQ-03 | Exact contact alert policy: primary-only or all-basic/one-priority? | all-basic, nearest contextual priority | team after privacy/failure review |
| OQ-04 | How will contacts volunteer live GPS? | temporary browser location sharing with clear opt-in and expiry | team UX/backend |
| OQ-05 | SMS gateway, billing, sender identity and compliance? | provider abstraction + fake adapter | team/deployment owner |
| OQ-06 | Firebase OTP quota/cost and test verification? | Firebase Auth phone test numbers in staging; budget limit | team backend |
| OQ-07 | How are shops verified in real pilot? | application+manual moderator review, no auto certification | team + faculty/ethics |
| OQ-08 | Media automatic capture vs user-initiated only? | separately consented, explicit capture; do not auto-camera from background | team/privacy review |
| OQ-09 | Which Android API levels and physical phones are testable? | two available Android devices, supported versions recorded | mobile team |
| OQ-10 | Alarm/check-in grace and escalation cadence? | check-in at ETA, 2-minute grace; primary promotion at 30s | team usability review |
| OQ-11 | Route scoring factor weights and max detour? | published baseline in `07_TIME_AWARE_ROUTING` | academic/data reviewer |
| OQ-12 | Shop notification triggered automatically? | opt-in owner + explicit user preference; disabled by default pending ethics | team/privacy review |
| OQ-13 | Temporary tracking link expiry policy? | 2h initial token, renewal during active event and hard revoke on resolve | security reviewer |
| OQ-14 | Evidence retention and user control? | short proposed limits in Security document | privacy reviewer |
| OQ-15 | Are model datasets/rights and mic foreground permissions feasible? | research prototypes and feature flag only | ML/native team |

## Change control

A change to ADR-003, ADR-004, ADR-005, event enums, tracking grant scopes or auto-SOS behavior requires explicit team decision and security/test re-review. Reviewer updates `README` and PRD after approval; neither execution agent may silently expand access to contacts, shops or recordings.

## Assumption log

- User is in India; product targets Indian urban walking journeys but no pilot city selected.
- No official 112/police API or volunteer agreement; only authorized call shortcuts and user-configured contacts.
- 'Nearby shop' data is a navigation aid, not certified support.
- Real sensor inference can be less accurate in motion, crowds, noise, transport and different phones. Device support cannot be assumed universal.
- A phone-number-only identity does not establish the true identity of a person or their relationship to the user.
## 10 November 2026 — authorized continuation

The user requested implementation of Phases 3/4, a black/purple palette, and application commits pushed to `main`. Agent instructions, ownership, prompts, execution ledger and PC transfer context remain exclusively on `handoff/agent-context` (and ignored local copies). This is authorization for controlled-demo implementation, not independent acceptance or permission to invent provider, model, survey or physical-device results. Existing partial G0–G2 and later G3/G4 remain explicit. One executor works backend then mobile sequentially; no delegated review is claimed.

CR-003 adds phase 3/4 wire operations and additive migrations 010/011. Local evidence uses authenticated single-object uploads and encrypted database storage as a fake storage adapter; HTTPS private object storage, malware scanner and MP4 sanitization remain external gates. Only validated, sanitized supported formats can be served in local mode. Initial SOS never invokes storage, capture, geocoding or a model. Shop delivery and ML automatic dispatch remain disabled without their required agreements/evaluation. Device behavior must be reported separately from component tests/builds.

Final local continuation: CSV catalog preparation preserves explicit rights/splits/onsets; calibration uses validation only and persists a model/dataset-bound freeze before test inference. The TensorFlow2.20 candidate exporter explicitly freezes Keras3 variables and refuses non-finite probabilities. Generated fixtures validate execution only and must fail graduation. No HTTP/schema or automatic-dispatch contract changes. API/worker startup merges the external erasure ledger and reconciles restored accounts before serving/processing; concurrent ledger publication is serialized. CI uses the runner Android SDK and Java21, matching the locally verified build.

## 11 November 2026 — prototype-only scope confirmed

The user explicitly clarified that this project needs a working demonstration prototype, not production deployment. Completion targets the local Android/browser/backend flow with emulated OTP/delivery, fictional route/shop fixtures and the bundled confirmation-only sound model. Production hosting/provider accounts, production signing, field deployment, independent release approval and research-grade model graduation are deferred and must not be presented as blockers to the demo. Phone rehearsal and fixes for actual runtime failures remain in scope. This does not invent a physical test result or phrase-recognition accuracy, certify historical phase gates, or enable automatic ML dispatch. Help/Bachao-specific training is a future extension to the current generic sound baseline. See [demo checklist](USER_CHECKLIST.md).

Latest explicit user decision,11 November2026: **Help and Bachao recognition must be implemented now**, while deployment stays deferred. This supersedes the earlier decision to defer those words. CR-005 implements pretrained offline English/Hindi Vosk word recognition alongside YAMNet, sharing one explicit-consent microphone stream and the existing manual-confirmation/cooldown flow. This avoids claiming that synthetic CNN training produced a learned distress detector. Real engine execution uses generated fixtures only; no human accuracy/device result is invented. Fixed prototype scope does not require production providers or research graduation. See [implementation/test report](validation/help-bachao.md).

## 12 November 2026 — phone feedback and navigation correction

The user reports a crash when Help/Bachao is recognized, excessive explanatory/technical text, confusing navigation and a receiver inbox requiring manual refresh. An unsupported Android `accessibilityRole="status"` is rendered only after a recognized word; Android's AccessibilityRole enum rejects it. Replace it with a supported polite live announcement and test the real native property path, not only the recognizer. Device crash logs remain a separate evidence source when the phone is connected. Simplify mobile navigation to Home/Journey/Contacts/More, give each optional tool its own page, and hide diagnostics/secondary explanations behind details while preserving meaningful consent, delivery uncertainty and emergency actions. Receiver updates remain bounded authenticated polling (not a new public stream or websocket contract): poll while signed in, avoid overlapping requests, pause hidden/offline and resume immediately on return. No schema, migration, dispatch or access-scope changes are authorized or required.

## 12 November 2026 — repeated-word opt-in and friendly phone flows (CR-007)

User confirms Help/Bachao recognition works on their phone (reported Moto, Android16); this is user-observed word recognition, not a full lifecycle/ANR/accuracy certification. New authorization supersedes the earlier prohibition on all automatic sensor dispatch for this local prototype: offer a separate, default-off, session-only repeated-word SOS option. Engineering defaults: five distinct finalized Help/Bachao words within30seconds, mixed languages allowed, then a10second visible cancellable countdown. Confidence remains0.75; it is not a danger probability. Count each word in a repeated sentence, deduplicate bilingual overlapping detections, never count partial results, and ignore the ordinary120second check-in cooldown for repetition counting. Cancellation clears the episode and suppresses stale trailing results; Stop/revocation/expiry/account change cancel pending dispatch. Manual SOS remains immediate and uses the same durable idempotent pipeline. No real provider or police dispatch is enabled. Explicit app consent and a visible monitoring notification remain required; no boot restart or stored auto-SOS preference.

Use a separate HIGH-importance check-in notification channel plus an in-app modal; the existing LOW microphone channel cannot pop up. Android/user settings/DND still control heads-up presentation; no full-screen-intent or overlay permission shortcut. Place-name search uses the phone's asynchronous Android geocoder with bounded requests and a dedicated worker for older Android; public OSM Nominatim restrictions make an unrestricted autocomplete inappropriate. No API key/provider purchase needed. In-app risk comparison remains explicitly fictional/sample-area-only; real selected places open walking directions in Maps and can be used as journey destinations. No coordinates or model diagnostics appear in normal product screens. Fake calls gain incoming/answered/ended caller-style presentation with working ringtone teardown and clear in-app simulation labelling. Theme remains dark purple with softer rose accents and supportive language, without gender stereotypes. HTTP/schema/migrations unchanged; native seam and tests/docs updated together.

## 12 November 2026 — motion, Voice tab and personal settings (CR-008)

User confirms the updated main features work well; motion-only is unreliable while the app remains open. Move Voice into bottom navigation; More retains PIN/motion/fake-call/extras; hamburger opens account/settings. Use the existing owner-scoped PATCH /me display_name field, allow a name up to80characters, and show a personal Home greeting without exposing another account’s name on sign-out/change. Phone OTP remains identity/authentication; the name is a user-entered display label, not verified identity. New users/custom E.164 numbers use the local Auth emulator and simulated delivery; invitation acceptance/consent must not be bypassed for newly added contacts. Explain normal versus duress PIN and no-SOS practice, recent authentication and notification visibility limits.

Motion correction replaces the overly strong >2.7g magnitude-only spikes with gravity-filtered, alternating-direction deliberate-shake detection, three impulses in2seconds after a short warm-up. Standard and more-responsive session sensitivity are engineering defaults, not calibrated violence/struggle recognition. Sustained acceleration, a single bump, sensor noise/invalid samples and walking-like low-amplitude sequences must not trigger. Keep motion-only explicitly foreground, no microphone, no automatic motion SOS; stop on pause/account/expiry and show clear ready/stopped state. Prevent voice/motion-only session conflicts with useful UI feedback. Native lifecycle/state and deterministic fake-sensor regression tests updated with the same detector used by the voice session’s motion support. HTTP/schema/hash/migrations unchanged; one sequential executor, physical Moto retest still required.

Receiver regression exposed a pre-existing rounded-departure edge: request at17:03:00.048Z carried default17:02:00Z, just outside the server’s60second past tolerance. Keep that backend validation. The web default now means Leave now and resolves a fresh timestamp when Compare is tapped; explicit stale selections get a useful client error and a Leave now reset. Existing journey/browser test covers recovery and the route/arrival flow.
