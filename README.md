# SurakshaAI — Agent-ready project specification (v1.0)

**Working name:** SurakshaAI (changeable; do not hard-code product branding).
**Product:** Android-first, India-focused women's safety mobile app with emergency alerting, explainable time-aware route risk indicators, verified/registered safe-shop discovery, situational on-device distress detection, and discreet safety controls.
**Documentation baseline:** review-1.2, 10 November 2026. **Current target, confirmed11 November2026:** a working local demonstration prototype. The implementation includes Phase3 discreet controls, private evidence/context, Phase4 export/deletion/recovery tooling and a black/purple interface. Authentication, delivery and storage are local/emulated; Lucknow routes/shops are fictional. The prototype is ready for phone testing. Production hosting/providers, release certification and research-grade model graduation are outside this demo's completion criteria. Historical [Phase3](docs/validation/phase-3.md) and [Phase4](docs/validation/phase-4.md) acceptance remains partial rather than being retroactively certified. No production emergency release is claimed.

## Run the demo

Start with [your demo checklist](docs/USER_CHECKLIST.md): run `npm run doctor`, connect/authorize a USB phone, install the bundled demo APK and rehearse the phone/browser flow. No production service accounts or deployment are needed.

The latest phone-test build includes offline English **Help** and Hindi **Bachao / बचाओ** recognition using bundled Vosk speech models, alongside YAMNet sound classification and motion check-ins. A recognized word shows a check-in. An optional repeated-word setting starts a cancellable SOS countdown after five Help/Bachao words within30seconds. Audio/transcripts stay local and are not saved/uploaded. See [phone setup](docs/PHONE_TEST.md), [phrase implementation evidence](docs/validation/help-bachao.md) and [ML tools](ml/README.md). Test actual phone behavior before presenting it; pretrained speech recognition is implemented, while human distress accuracy remains unmeasured.

The 12 November phone-feedback update simplifies navigation (now Home, Voice, Journey, Contacts and More), fixes an Android recognized-word rendering exception, and adds automatic receiver inbox/tracking updates with connection recovery. Install the rebuilt demo APK before retesting; see [fixes and verification](docs/validation/phone-feedback-fixes.md).

The latest [friendly phone update](docs/validation/friendly-phone.md) adds the separate repeated-word SOS option, visible check-in pop-ups, place-name lookup/Maps directions and caller-style fake calls. Real place lookup depends on the phone’s location service and connectivity; route-risk comparison remains fictional.

The latest motion/profile update adds a dedicated Voice tab, hamburger settings, a saved name/Home greeting and a revised foreground shake check-in. See [names, custom users and PINs](docs/DEMO_ACCOUNTS_AND_PIN.md) and [motion/profile verification](docs/validation/motion-profile.md).

See [RUNNING.md](RUNNING.md) for clean setup, test accounts, Android instructions and troubleshooting. See the [Phase 1 evidence](docs/validation/phase-1.md) and [Phase 2 evidence](docs/validation/phase-2.md) for implemented scope and remaining acceptance work. This is not a production emergency deployment.

The repository contains `apps/mobile`, `apps/responder-web`, `services/api`, `services/worker`, `packages/contracts`, `infra`, `scripts` and `tests`. The [machine-readable API](packages/contracts/openapi.yaml) includes controlled-demo Phase 3/4 operations and explicitly disabled conditional capabilities. See the [contract lock](packages/contracts/CONTRACT_LOCK.md).

> **Safety positioning:** This app supplements, and must never replace, official emergency services. It does not predict or guarantee personal safety. In India, include a direct 112 emergency-call shortcut; do not claim police dispatch integration without an actual agreement/API.

## Source-of-truth and attribution

1. **User-uploaded `women's safety app outline.docx`**: SOS, shake/power trigger concept, fake call, safe journey, scream/struggle detection, safe-shop network, competitor notes, and basic app/backend/database/services sketch.
2. **Team decisions from project discussion:** time-aware route inputs (lighting, isolation, crowdsourced reports, open businesses, police proximity); contextual evidence bundle; priority matching among the user's preconfigured emergency contacts; opt-in monitoring only when needed (not 24/7).
3. **Faculty requirements/feedback as reported by team:** faculty requested time-aware route safety scoring and differentiation; recent feedback suggested adding Fake PIN and optional low-battery auto-location broadcast alongside a proposed silent volume-key code. **Low-battery auto-location broadcast is explicitly excluded by team decision.** Do not attribute other innovations to faculty.
4. **Externally verified implementation constraints:** see [docs/19_REFERENCES.md](docs/19_REFERENCES.md). Competitor comparisons in the uploaded outline are **research hypotheses**, not verified claims.

## What is committed

- Emergency contact setup, SOS initiation, live tracking, alert status/history, SMS/push adapters, web responder view, manual emergency hotline shortcut.
- Time-aware **relative route risk indicator** (with uncertainty and sources), plus shortest/fastest comparison and route reasoning.
- Safe journey with deadline, acknowledgement, server-side overdue evaluation.
- Safe-shop candidate search; shop opt-in registration and verification workflow; reported opening hours distinguished from live confirmation.
- Fake incoming call, candidate volume-key trigger and Fake PIN/duress mode; experimental triggers feature-flagged until demonstrated on target Android versions.
- Situational on-device audio + motion detection, not permanent listening; gated by real-device evaluation, consent and battery tests.
- Context-rich alerts using location, timestamp, location freshness, battery if available, motion/travel context if reliable, and optional user-consented audio/photo evidence. Capture must never block alert dispatch.

## Read in this order

| Reading | Document | Purpose |
|---|---|---|
| 1 | [01_PROJECT_CHARTER.md](docs/01_PROJECT_CHARTER.md) | Mission, non-goals, scope and principles |
| 2 | [02_PRD.md](docs/02_PRD.md) | Requirement IDs and acceptance criteria |
| 3 | [03_ARCHITECTURE.md](docs/03_ARCHITECTURE.md) | Modules, boundaries, asynchronous flows |
| 4 | [04_DATA_MODEL.md](docs/04_DATA_MODEL.md) | Tables, ownership, indexes, retention |
| 5 | [05_API_CONTRACTS.md](docs/05_API_CONTRACTS.md) | Endpoints, payloads, authentication and errors |
| 6 | [06_SOS_AND_RESPONDER_FLOW.md](docs/06_SOS_AND_RESPONDER_FLOW.md) | State machine, escalation, offline rules |
| 7 | [07_TIME_AWARE_ROUTING.md](docs/07_TIME_AWARE_ROUTING.md) | Scoring formula and confidence handling |
| 8 | [08_DISTRESS_DETECTION.md](docs/08_DISTRESS_DETECTION.md) | Device ML, gating, test protocol |
| 9 | [09_SAFE_SHOP_NETWORK.md](docs/09_SAFE_SHOP_NETWORK.md) | Shops, verified status, response workflow |
| 10 | [10_STEALTH_AND_DURESS.md](docs/10_STEALTH_AND_DURESS.md) | Fake PIN, fake call, key trigger limitations |
| 11 | [11_SECURITY_PRIVACY.md](docs/11_SECURITY_PRIVACY.md) | Threat model, privacy and abuse prevention |
| 12 | [12_UI_UX.md](docs/12_UI_UX.md) | Screens, accessibility and interaction rules |
| 13 | [13_TEST_PLAN.md](docs/13_TEST_PLAN.md) | Automated/real-device validation, release gates |
| 14 | [14_IMPLEMENTATION_PHASES.md](docs/14_IMPLEMENTATION_PHASES.md) | Four execution phases with dependencies |
| 15 | [15_DEVOPS_AND_OPERATIONS.md](docs/15_DEVOPS_AND_OPERATIONS.md) | Environments, delivery telemetry and runbooks |
| 16 | [16_DATA_SOURCES.md](docs/16_DATA_SOURCES.md) | Data provenance and quality assessment |
| 17 | [17_DECISIONS_AND_OPEN_QUESTIONS.md](docs/17_DECISIONS_AND_OPEN_QUESTIONS.md) | ADRs, outstanding choices |
| 18 | [18_COMPETITIVE_RESEARCH.md](docs/18_COMPETITIVE_RESEARCH.md) | Existing-app comparison and research caveats |
| 19 | [19_REFERENCES.md](docs/19_REFERENCES.md) | Primary official technical links |
| 20 | [20_DEMO_AND_VIVA.md](docs/20_DEMO_AND_VIVA.md) | Honest demonstrations and defense questions |
| 21 | [21_REQUIREMENTS_TRACEABILITY.md](docs/21_REQUIREMENTS_TRACEABILITY.md) | Trace professor vs team vs source document |
| 22 | [22_CODEX_REVIEWER_HANDOFF.md](docs/22_CODEX_REVIEWER_HANDOFF.md) | Copy-ready reviewer and executor prompts |

Development agents: read [AGENTS.md](AGENTS.md), where available locally, and the reviewed execution package below before editing code. The original architecture review describes the documentation-only baseline; the validation reports above describe the subsequent implementation. Preserve existing user changes.

## Reviewed execution package

Agent instruction, ownership, handoff and execution-state files referenced below are local-only and intentionally excluded from GitHub by .gitignore. The shared architecture, implementation plan and technical specifications remain versioned.

| Document | Purpose |
|---|---|
| [Architecture review](docs/ARCHITECTURE_REVIEW.md) | Full read inventory, severity-ranked findings, official evidence and readiness |
| [Execution master plan](docs/EXECUTION_MASTER_PLAN.md) |50 tasks in four phases, dependencies, paths, gates and recovery |
| [Agent ownership](docs/AGENT_OWNERSHIP.md) | B/M/R boundaries, merges, fixes and review |
| [Integration contracts](docs/INTEGRATION_CONTRACTS.md) | Frozen design semantics, native seams, G0 artifacts and change control |
| [Testing and acceptance gates](docs/TESTING_AND_ACCEPTANCE_GATES.md) | Measurable critical, device/provider, scoring and ML criteria |
| [State template](docs/EXECUTION_STATE_TEMPLATE.md) | Canonical checkpoint and phase-completion report |
| [Technical risks/decisions](docs/TECHNICAL_RISKS_AND_DECISIONS.md) | Resolved defaults, external prerequisites and fallbacks |
| [Executor handoff](docs/EXECUTOR_HANDOFF_PROMPT.md) | Exact continuous-execution prompt |

Critical provider correction: FCM emergency use is blocked by [official FCM guidance](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority). Preserve provider-neutral push and fake-mode tests; live operation needs a permitted path. No benchmark/device/provider result is claimed by these planning documents.

## Global conventions

- UUID primary keys; UTC timestamps (`ISO 8601`); India phone numbers stored in E.164; coordinates WGS84 `latitude, longitude` at the API boundary, PostGIS SRID 4326 in storage.
- On all API writes use `Idempotency-Key` where stated. Errors: `code`, `message`, `request_id`; no secrets or sensitive details in error messages.
- A **trusted contact** is invited/verified; not automatically a live-location participant. Location-ranked matching works **only** for explicit contact-location sharing with a current timestamp; otherwise use a safe fallback.
- A **safe shop** is a participating/verified *assistance point*, not a guaranteed safe location or emergency service.
- **Score** = relative estimated route conditions, **not** calibrated probability of incident or guarantee.
- Separate `must` from `experimental` and `optional`. A blocked experimental feature must not block core SOS release.
