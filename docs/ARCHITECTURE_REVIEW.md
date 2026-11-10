# Architecture review — SurakshaAI

Review baseline: **review-1.2, 10 November 2026**. Verdict: **conditionally executable for local implementation; not approved for live emergency deployment**. The proposed Android/native + modular Node/PostGIS architecture is feasible. Critical behavior needs durable state, explicit permission boundaries and independent device/provider evidence. No application code, builds, model evaluations, deployments or executor agents were run in this review.

## Evidence and scope

The repository contains specifications, a Git repository on main, and source-derived notes; no application, OpenAPI file, SQL migration or model exists. Git initially reported a modified tracked Readme.md and untracked AGENTS.md, docs/ and source/. Those changes were preserved. Windows resolves README.md to the tracked Readme.md; avoid creating a second case-variant file.

Read completely: README.md; AGENTS.md; source/OUTLINE_SOURCE_NOTES.md; all 25 pre-existing docs Markdown files:

| Documents | Review focus |
|---|---|
| 01_PROJECT_CHARTER.md; 02_PRD.md; 21_REQUIREMENTS_TRACEABILITY.md | Scope, requirement IDs, exclusions, attribution |
| 03_ARCHITECTURE.md; 04_DATA_MODEL.md; 05_API_CONTRACTS.md | Component compatibility, database, endpoint coverage |
| 06_SOS_AND_RESPONDER_FLOW.md; 07_TIME_AWARE_ROUTING.md; 08_DISTRESS_DETECTION.md | Critical path, scoring, ML feasibility |
| 09_SAFE_SHOP_NETWORK.md; 10_STEALTH_AND_DURESS.md | Consent and Android limitations |
| 11_SECURITY_PRIVACY.md; 12_UI_UX.md; 13_TEST_PLAN.md | Threats, user states, acceptance |
| 14_IMPLEMENTATION_PHASES.md; 15_DEVOPS_AND_OPERATIONS.md; 16_DATA_SOURCES.md | Ordering, deployment, provenance |
| 17_DECISIONS_AND_OPEN_QUESTIONS.md; 18_COMPETITIVE_RESEARCH.md; 19_REFERENCES.md; 20_DEMO_AND_VIVA.md; 22_CODEX_REVIEWER_HANDOFF.md | Decisions, evidence, claims and handoff |
| AGENT_OWNERSHIP.md; INTEGRATION_CONTRACTS.md; TECHNICAL_RISKS_AND_DECISIONS.md | Existing review-1.1 closures, ownership and remaining seams |

The original DOCX is absent from the repository; only the source notes were available. This review does not claim to have read or independently verified the original outline or competitor assertions. The current user's full request is an additional specification. Node/npm/pnpm/Docker were not discoverable on this shell PATH; Java and Git were discoverable. This is a setup prerequisite, not proof those tools are absent from the machine.

## Findings and disposition

BLOCKER prevents the affected live use or contract freeze; HIGH threatens correctness/privacy or a phase gate; MEDIUM affects robustness/maintainability; LOW affects clarity. “Design closed” means documented resolution, never implemented/tested.

| ID / severity | Finding and affected specification | Recommendation, justification and status | Owner / proving task |
|---|---|---|---|
| A01 BLOCKER | FCM is named as a routine emergency channel in 03/15 although review-1.1 D30 flags a prohibition. | Preserve push as a requirement behind a provider-neutral adapter; fake push only until a permitted live path is established. Describing it as secondary does not cure provider restrictions. Design corrected; live prerequisite open. | B/deployer; P1-T12, P4-T03 |
| A02 BLOCKER | Human-readable endpoint tables do not constitute a frozen, executable contract. Generated schemas/fixtures are absent. | B generates the complete catalogue, M checks consumers, R records G0 hash before parallel feature work. Include negative fixtures and native payload serialization. | B/M/R; P1-T03 |
| A03 HIGH | Offline “queue for later” can dispatch after a user stops or logs into a different account; network timeout is ambiguous. | Retain review-1.1 immutable native-owned journal, reconciliation and shared create/terminate lock. Bound silent retry to 5 minutes and distinguish an unknown outcome from unsent. | M/B; P1-T06, T10 |
| A04 HIGH | External provider send cannot be made exactly once by a database outbox. Receipt/ACK/status conflation and crash-after-send remain hazards. | Persist logical intents and attempts; bounded leases, adapter reconciliation, independent human ACK, terminal suppression. Test ambiguity rather than promise zero physical duplicates. | B; P1-T07, T08 |
| A05 HIGH | 06 state diagram still allows ACTIVE→CANCELLED and omits CREATED→RESOLVED, conflicting with locked semantics. | Correct diagram; cancellation only before lease/attempt, resolution permitted from every nonterminal state. Terminal states cannot reopen. | B; P1-T06 |
| A06 HIGH | Background audio, camera, keys and fake-call presentation can be overstated. | Start typed foreground service from visible activity; deny unsupported starts; keep camera capture explicit in visible UI. Focused volume keys only; reminder-to-open fake call when backgrounded. | M; P1-T02, P3-T01/T04/T10 |
| A07 HIGH | Kotlin monitoring forwarding only through RN JS can lose SOS while JS is suspended. | Native owns one encrypted journal/auth transport and trigger UUID; JS observes it. Prove accepted event with JS suspended and mic/session stop. | M; P1-T10, P3-T07 |
| A08 HIGH | 2h tracking grants expire before 24h events; duplicate-tab cookies and lost exchange responses are undefined. | Define explicit exchange retry binding, independent grant-scoped cookie names, active-session recovery and grant-reissue UI. Never silently extend access. Bearer forwarding risk remains explicit. | B; P1-T09 |
| A09 HIGH | Journey process-death reconciliation, contact re-consent and exact nested media/hour schemas are incomplete. | Add owner journey list, explicit re-consent route and closure types; no implicit client-designed fields. | B; P1-T03, P2-T08 |
| A10 HIGH | A scoring formula alone cannot establish route legality, geospatial coverage, three distinct routes or safety outcomes. | GraphHopper edge/detail spike, versioned segment mapping, traversal-time scoring, unknown quality decay, candidate count fallback and independent survey. Scores estimate favorable conditions, not incident probability. | B; P2-T01–T05 |
| A11 HIGH | ≥2h negative monitoring in 08 is only a smoke test and cannot establish a low false-alarm rate. | Add separated dataset minima, event-level recall/precision, confidence intervals, ≥30h negatives, auto-dispatch graduation gate and confirmation-only fallback. Targets are engineering criteria, not results. | M; P3-T05–T09 |
| A12 HIGH | Erasure can leave initial coordinates, request bodies, route geometry, media metadata or backups after deleting trail rows. | Enumerate every copy; minimize idempotency records; purge traces/media/context/route inputs; deletion ledger reapplied on restore. Consent withdrawal revokes access immediately. | B; P1-T04, P4-T02 |
| A13 HIGH | Missing project credentials, SMS sender permission, devices, region, data rights, shops and operational review prevent credible live validation. | Name owners and blocked gates; continue fake-mode work. Never claim mock success proves a real provider or physical device. | R/deployer; risk register |
| A14 MEDIUM | Root incorrectly described as lacking Git; state-file names and broad phase prompts conflict. | Preserve existing Git; make EXECUTION_STATE.md canonical and IMPLEMENTATION_STATUS.md a generated compatibility view; replace legacy plan/handoff with links. | B/R; P1-T01 |
| A15 MEDIUM | Runtime, native ABI, maps and LiteRT versions are unspecified; public tile policies conflict with no-referrer private pages. | Lock supported versions after a compile spike, test 16KB native pages, use configured private/approved tiles, no public Nominatim dependency. | B/M; P1-T01–T03 |
| A16 LOW | Lower risk is favorable but risk_indicator increases for favorable conditions; example uses invalid IDs/lowercase enums. | Keep v1 wire name, label “estimated conditions” with direction legend; normalize examples; distinguish fictional values from measured results. | B/M; P1-T03, P2-T11 |
| A17 MEDIUM | A time-weighted95th percentile can miss a short adverse stretch below5% of total time; factor transforms remain underspecified. | Correct mathematical claim, publish worst100m separately and freeze explicit baseline transforms/quality/freshness in07. These remain unvalidated proxies with a sensitivity gate. | B/R; P2-T04/T05 |

The input already provides strong consent, outbox, lease, retention and API closure work. This review retains it rather than claiming it was absent. Remaining closures and task-level verification are now specified in [contracts](INTEGRATION_CONTRACTS.md), [master plan](EXECUTION_MASTER_PLAN.md) and [gates](TESTING_AND_ACCEPTANCE_GATES.md).

## Platform and stack feasibility

| Area | Official evidence checked in this review | Engineering conclusion |
|---|---|---|
| RN + Kotlin | [RN versions](https://reactnative.dev/versions), [native modules](https://reactnative.dev/docs/turbo-native-modules-introduction) | Use bare RN, supported stable 0.88 line at review time, TS Codegen/TurboModule seams. Pin exact compatible patches in P1; no Expo Go dependency for custom services. |
| API/web | [Node schedule](https://github.com/nodejs/Release), [Express 5 requirements](https://expressjs.com/en/guide/migrating-5/), [Next installation](https://nextjs.org/docs/app/getting-started/installation) | Node26 LTS, Express5, patched Next16 are compatible candidates. Keep mobile/web React versions local to each app; lock install/build before G0. |
| DB | [PostgreSQL support](https://www.postgresql.org/support/versioning/), [PostGIS setup](https://postgis.net/documentation/getting_started/), [distance units](https://postgis.net/docs/ST_DWithin.html) | Supported PostgreSQL17 + compatible PostGIS3 image; verify extension in CI. Geography queries use metres, not degrees. Plain parameterized SQL is sufficient. |
| Outbox | [PostgreSQL locking](https://www.postgresql.org/docs/current/sql-select.html) | SKIP LOCKED supports queue consumers. One durable DB plus separate worker process is adequate; leases and idempotency remain application obligations. |
| Android | [FGS restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start), [service types](https://developer.android.com/develop/background-work/services/fgs/service-types), [location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions) | Visible start, correct types/permissions, revocation and process-death fallback are mandatory. Coarse location remains usable and labelled. |
| Keys/call UI | [Input events](https://developer.android.com/develop/ui/views/touch-and-input/input-events), [Android14 changes](https://developer.android.com/about/versions/14/behavior-changes-14), [alarms](https://developer.android.com/develop/background-work/services/alarms) | Focused key handlers do not establish a global trigger. Fake call gets no privileged full-screen or exact-alarm assumption. |
| Native distributions | [Play targets](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en), [16KB pages](https://developer.android.com/guide/practices/page-sizes) | At review, new Play submissions require target API36. Minimum Android10/API29 remains a separate support choice; verify native page alignment and current policy again at release. |
| ML | [LiteRT Android](https://developers.google.com/edge/litert/android) | Kotlin CPU Interpreter baseline avoids accelerator variability; bundled model/runtime works without a first-run download. Compare conversion parity before acceleration. |
| Maps | [GraphHopper API](https://github.com/graphhopper/graphhopper/blob/master/docs/web/api-doc.md), [MapLibre RN](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/), [OSM tiles](https://operations.osmfoundation.org/policies/tiles/), [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) | Generate walking alternatives then score them; this does not solve globally optimal time-dependent routing. MapLibre is a rendering candidate, not a tile/data service. Private tracking must use policy-compatible tiles. |
| Identity | [Phone auth](https://firebase.google.com/docs/auth/android/phone-auth), [ID verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [auth limits](https://firebase.google.com/docs/auth/limits) | Backend verifies project-bound ID tokens; ordinary verification does not check revocation. OTP controls a number, not a trusted relationship. Credentials/quota remain external. |
| Notifications | [FCM warning](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority), [Google API terms](https://developers.google.com/terms/), [SMS permissions](https://support.google.com/googleplay/android-developer/answer/10208820) | FCM emergency use is blocked. Server SMS avoids device SMS permission but still needs provider permission, templates and delivery semantics. |
| Emergency shortcut | [Official ERSS](https://112.gov.in/) | Provide system dialer action. No agreement/API exists here for direct police dispatch. |

These are source-backed constraints followed by architectural judgments, not executed feasibility results. Exact provider fees, SDK patches and quotas must be recorded at activation; this review makes no price or legal-compliance assertion.

## Final design and readiness

The definitive component/module/path design is in [03_ARCHITECTURE.md](03_ARCHITECTURE.md); persistence remains in [04_DATA_MODEL.md](04_DATA_MODEL.md), wire schema input in [05_API_CONTRACTS.md](05_API_CONTRACTS.md). The four implementation phases contain 50 uniquely numbered tasks, requirements mapping, dependency graph, integration checkpoints and rollback instructions. Only P1 foundation work may begin before G0. Parallel feature execution requires G0; later phase acceptance requires its previous phase gate.

No committed requirement was silently removed. Explicit exclusions remain excluded. FCM has a documented provider change requirement; optional video remains a foreground/user-selected evidence path; global keys, power-gesture concept and automatic ML retain conditional outcomes. A disabled experiment is a recorded limitation, not proof of successful implementation. Controlled demo, real-provider validation and live pilot approval are distinct gate results.

## Deliverable/change manifest

Created: [EXECUTION_MASTER_PLAN.md](EXECUTION_MASTER_PLAN.md), [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md), [TESTING_AND_ACCEPTANCE_GATES.md](TESTING_AND_ACCEPTANCE_GATES.md), [EXECUTION_STATE_TEMPLATE.md](EXECUTION_STATE_TEMPLATE.md), [EXECUTOR_HANDOFF_PROMPT.md](EXECUTOR_HANDOFF_PROMPT.md).

Updated existing requested deliverables: [AGENT_OWNERSHIP.md](AGENT_OWNERSHIP.md), [INTEGRATION_CONTRACTS.md](INTEGRATION_CONTRACTS.md), [TECHNICAL_RISKS_AND_DECISIONS.md](TECHNICAL_RISKS_AND_DECISIONS.md).

Aligned existing specifications: README.md, AGENTS.md; docs/03_ARCHITECTURE.md,04_DATA_MODEL.md,05_API_CONTRACTS.md,06_SOS_AND_RESPONDER_FLOW.md,07_TIME_AWARE_ROUTING.md,08_DISTRESS_DETECTION.md,10_STEALTH_AND_DURESS.md,11_SECURITY_PRIVACY.md,13_TEST_PLAN.md,14_IMPLEMENTATION_PHASES.md,15_DEVOPS_AND_OPERATIONS.md,17_DECISIONS_AND_OPEN_QUESTIONS.md,19_REFERENCES.md,21_REQUIREMENTS_TRACEABILITY.md,22_CODEX_REVIEWER_HANDOFF.md. No source requirements or unrelated files removed.

## Planning verification executed

PowerShell static checks inspected33 Markdown files: all eight requested deliverables exist;50 unique numbered tasks, each with owner/paths, inputs/dependencies, instructions, output and verification; all30 PRD IDs explicitly represented; no unknown full task-ID references; no broken relative Markdown links. A dependency-map topological check covered50/50 tasks with no cycles, including sequential migration prerequisites and shared-contract gate. Manual review checked required features/exclusions, shared API/native ownership, phase exit/rollback and interruption handling. Git diff --check passed (only Git's existing Windows LF→CRLF advisory). These are documentation checks only; G0, application tests, device tests, provider validation and benchmarks remain NOT_RUN.

Ready next: P1-T01 local setup using [the exact handoff](EXECUTOR_HANDOFF_PROMPT.md). Open external prerequisites remain R01–R09 in the risk register; they block affected real validation/pilot, not initial fake-mode implementation.
