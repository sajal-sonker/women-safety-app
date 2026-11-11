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
