# SurakshaAI — master execution plan

**Baseline review-1.2 — 10 November 2026.** This is an implementation specification for future executors. The planning run implements nothing. Follow [AGENTS.md](../AGENTS.md), [review](ARCHITECTURE_REVIEW.md), [ownership](AGENT_OWNERSHIP.md), [contracts](INTEGRATION_CONTRACTS.md) and [testing gates](TESTING_AND_ACCEPTANCE_GATES.md).

## Execution rules and definitive paths

R = independent reviewer; B = backend/web executor; M = mobile/native/ML executor. Each numbered task has one accountable owner; consumers supply reviews/test evidence. No agent launches other agents automatically. One executor may perform B and M work sequentially; independent review remains a distinct gate.

All code paths below are **planned paths**. Do not mistake them for existing code. Baseline inputs are actual linked documents; code artifacts become prerequisites only after their producing tasks finish.

| Planned path | Purpose / owner |
|---|---|
| package.json, package-lock.json, .node-version, .github/workflows/, infra/ | npm workspaces, exact dependencies, CI, local/deploy setup / B |
| packages/contracts/openapi.yaml, src/generated/, fixtures/, CONTRACT_LOCK.md | canonical schemas, generated TS/native network schemas, examples, freeze record / B |
| packages/contracts/src/provider-interfaces.ts | server adapter contracts; never included in mobile bundle / B |
| packages/shared/ | small pure non-sensitive utilities only; no duplicated domain rules / B |
| services/api/src/modules/{identity,contacts,sos,locations,delivery,tracking,journeys,routing,reports,shops,evidence,privacy}/ | HTTP-independent domain services with thin routes / B |
| services/api/src/platform/{db,auth,config,crypto,logging}/; services/api/migrations/ | shared platform and the sole migration stream / B |
| services/api/tests/{unit,contract,integration}/ | real PostGIS/domain/security tests / B |
| services/worker/src/{outbox,scheduler,retention}/ | process entrypoints importing API domain services, no internal HTTP loop / B |
| apps/responder-web/src/app/{track,contacts,contact-location,shops,admin}/ | one Next app, no direct DB access / B |
| apps/responder-web/tests/ | browser scope, CSRF, location, moderation and media tests / B |
| apps/mobile/src/{app,features,api,localization}/; apps/mobile/specs/ | RN screens/state/generated-client wrappers and typed native seams / M |
| apps/mobile/android/app/src/main/java/com/surakshaai/{auth,journal,location,monitoring,ml,triggers,evidence}/ | Kotlin state, transport, services and device integrations / M |
| apps/mobile/docs/; apps/mobile/tests/ | native interface, device evidence and mobile tests / M |
| ml/{data,training,evaluation,export,models}/ | private-data manifests, scripts, reports, model artifacts / M |
| docs/validation/ | immutable redacted task/gate reports / R integrates executor evidence |
| EXECUTION_STATE.md; IMPLEMENTATION_STATUS.md | canonical checkpoint plus generated compatibility view / one designated state writer |

Use Node26 LTS, npm workspaces and one root lockfile; Express5 + TypeScript + pg parameterized SQL + SQL migrations; PostgreSQL17/PostGIS3 compatible image; patched Next16; bare supported RN0.88 + Kotlin TurboModules; MapLibre candidate; bundled LiteRT CPU Interpreter. P1-T01/T02 pin exact patches, JDK/AGP/Gradle/SDK, native libraries and container digests after compatibility checks. RN template owns its React/Kotlin/Gradle matrix; do not force the web React version into mobile. No Redis, message broker, Kubernetes, GraphQL, WebSockets or second admin app. A version incompatibility is resolved through the smallest supported combination and documented CR before G0.

## Contract freeze and task dependency rules

Before G0, only P1-T01 root setup, T02 isolated platform compile/spikes, and T03 schema generation/review may proceed. No parallel API/mobile feature implementation. T03 depends on T01; T02 depends on T01; T02 and T03 may overlap because they own different files and T03 uses the documented wire specification. Freeze occurs only after both finish and R records their hashes/evidence.

Freeze: OpenAPI every method/schema/status/security scheme; generated clients/runtime validators/native network serialization; enum/error/event/notification definitions; native journal/auth handoff; adapter interface; canonical fixtures; migration allocation; consent/retention/time policies; toolchain lock. Lock hash and approval protocol are in [integration contracts](INTEGRATION_CONTRACTS.md). A changed contract is one reviewed producer+consumer+test integration batch.

Dependency graph (all cross-phase dependencies point forward):

1. P1-T01 → {P1-T02, P1-T03} → G0.
2. G0 → B lane T04→T05→T06→{T07,T09}; T07→T08. M lane T10→T11→T13. T12 joins B adapters; T14 joins all P1 implementation; T15 produces G1.
3. G1 → P2-T01; data/routing T02→T03→T04→T05, moderation T06/T07, journeys T08/T09 and M screens T10/T11 overlap at their explicit dependencies → T12/G2.
4. G2 → P3 independent discreet-controls, evidence and ML lanes → P3-T12 integrated verification → T13/G3.
5. G3 → P4 security/privacy/provider/device/operations lanes → P4-T09 release rehearsal → T10/G4.

“Depends on G0/G1/G2/G3” always includes all work producing that gate. Do not start an incomplete gate's dependent product phase; unrelated tooling or blocker investigation can continue and is marked preparatory. No deadline estimate substitutes for a passed prerequisite.

## Phase 1 — Foundation and reliable SOS

**Objective/outcomes:** Android manual SOS, trusted contacts, verified identity, durable event/outbox, explicit transport status, bounded live location and authorized browser response. No ML, scoring, media or shop dependency in the SOS transaction.

**Prerequisites:** reviewed docs, existing Git work preserved, Android/Node/PostGIS development tools or a recorded setup blocker. Credentials are unnecessary for fake-mode work. **Database/API:** reserved migrations001–006; identity/contacts/devices/SOS/locations/grants/ACK/providers/health routes in [05](05_API_CONTRACTS.md). **Integrations:** Auth emulator, fake SMS/push/maps; real phone-auth/SMS only after external setup. A blocked real push provider is visible.

### P1-T01 — Preserve baseline and scaffold workspace

- **Owner / paths:** B; root manifests/lockfile, infra/, .github/, EXECUTION_STATE.md.
- **Inputs/dependencies:** existing Git status and all reviewed docs; none.
- **Instructions:** Record branch and dirty/untracked paths; preserve user files. Establish baseline without reset/clean. Add npm workspaces and exact engine versions, TS/lint/test/build scripts, Docker PostGIS, API/worker/web process skeletons, env examples, fake-provider default and CI egress controls. M supplies mobile dependencies; B alone installs/changes root lockfile. Record tool setup needs without silently purchasing services.
- **Output:** reproducible local scaffold, empty task ledger from template, command surface below.
- **Verify:** clean-checkout install/build skeletons and PostGIS extension query; secret scan; record exit codes. No feature PASS from a skeleton.

### P1-T02 — Compile Android seams and prove platform boundaries

- **Owner / paths:** M; apps/mobile/, apps/mobile/docs/platform-spikes.md.
- **Inputs/dependencies:** T01; native lifecycle decisions in 03/08/10.
- **Instructions:** Create bare RN Android app; pin template JDK/SDK/Gradle. Compile minimal native auth/location/journal interface, MapLibre renderer and bundled LiteRT smoke model in isolated spikes. Test visible-start location/microphone FGS, permission denial, JS suspension, focused keys, screen-off and notification denial. Do not build full monitoring or a global-key workaround. Produce typed native seam draft for G0.
- **Output:** debug APK/build log, toolchain compatibility manifest, supported/unsupported matrix and fallbacks.
- **Verify:** emulator build and instrumentation; physical observations separately labelled if devices available. Check ABI/16KB dependencies. A missing device blocks device claims, not schema preparation.

### P1-T03 — Materialize, validate and freeze shared contracts

- **Owner / paths:** B authors packages/contracts/; M reviews; R accepts G0.
- **Inputs/dependencies:** T01 plus final T02 seam/compile results for freeze; 04/05/integration contracts.
- **Instructions:** Enumerate every v1 route and named nested schema, success/error status, security scope and feature capability. Generate TS clients, Ajv standalone validators and native network schema artifacts; do not hand-copy types. Include all synthetic fixtures, provider interface and contract tests. Make all examples schema-valid. Reserve migrations and approved defaults in CONTRACT_LOCK.md.
- **Output:** hash-addressed complete v1 contract, native seam lock and G0 record.
- **Verify:** schema lint, positive/negative fixture validation, deterministic regeneration, native/JS serialization round-trip and M/R review. Feature work waits for G0; placeholders or permissive unknown fields fail freeze.

### P1-T04 — Build persistence, authorization and retention primitives

- **Owner / paths:** B; migrations001–006, API platform and identity modules.
- **Inputs/dependencies:** G0.
- **Instructions:** Apply phased P1 tables from 04, keys/indexes/FK rules and migration ledger. Add JWT project verifier, disabled-account checks, browser auth/CSRF, server roles, structured errors/request IDs, encrypted provider material, DB clock abstraction and redacted logging. Create purge jobs for P1 data now. Restrict importer/worker/API credentials by role; no web direct SQL.
- **Output:** migration runner, identity API and authorization helpers.
- **Verify:** empty/upgrade DB migration integration tests, expiry/revocation/emulator isolation, forged role/owner, request-log redaction and purge of duplicated location fields.

### P1-T05 — Implement contact consent, devices and optional contact GPS

- **Owner / paths:** B; contacts/identity modules, web contacts and contact-location routes.
- **Inputs/dependencies:** T04.
- **Instructions:** Implement contacts CRUD/cap under owner lock, invitation delivery/expiry, invited-phone OTP match, accept/decline/block/reopen/withdraw semantics. Register/rotate app push installations. Build browser consent and temporary GPS page with visible stop; retain latest only and expose availability rather than coordinates to owner. Contact location is optional and cannot block setup or SOS.
- **Output:** authenticated contact lifecycle and device registration.
- **Verify:** concurrent cap, wrong-phone forwarded invite, scanner GET inert, revoke/block/re-consent, expired GPS, no owner GPS read, device-token reassignment and 0/1/5 contacts.

### P1-T06 — Implement atomic SOS and terminal intent reconciliation

- **Owner / paths:** B; sos/locations modules and API integration tests.
- **Inputs/dependencies:** T05.
- **Instructions:** Implement immutable request hash, same intent lock for create/terminate, zero-location/zero-recipient acceptance, recipient/grant/intent snapshots in one transaction, owner detail/history/by-client-key, deduped position writes and monotonic latest position. Implement resolve/cancel/24h expiry and revoke/suppress atomically. Rank only already-stored fresh consented GPS; otherwise priority. No external call inside SOS transaction.
- **Output:** durable state machine and recovery endpoints.
- **Verify:** 5 parallel replays, hash mismatch, rollback injection, late create vs terminate, stale/out-of-order GPS, cancel vs lease, resolve from CREATED, cross-owner denial and late receipt no reopening.

### P1-T07 — Implement outbox delivery and receipt reducer

- **Owner / paths:** B; delivery module, services/worker/src/outbox/, fake providers.
- **Inputs/dependencies:** T06.
- **Instructions:** Lease bounded jobs with expiry, persist attempt before network, call adapter outside transaction, classify transient/permanent/unknown outcomes, reconcile ambiguous send, apply retry/age bounds and terminal checks. Verify signed raw-body callbacks/replay and monotonic receipt reduction. Fan out initial basic intents to all verified contacts; FCM live emergency sending stays disabled.
- **Output:** restart-safe worker, adapter conformance suite and dead-letter view/runbook.
- **Verify:** worker kill before/after send, two workers, lease expiry, 429, duplicate/out-of-order/forged callbacks, accepted≠delivered, ambiguous timeout and revoke during in-flight call.

### P1-T08 — Add human acknowledgement, promotion and expiry scheduler

- **Owner / paths:** B; delivery/sos domain, services/worker/src/scheduler/.
- **Inputs/dependencies:** T07.
- **Instructions:** Store independent append-only ACK and ETA; allow CAN_ASSIST→CANNOT_ASSIST. Schedule 30s promotion, accelerate rejection, promote each eligible alternate once, stop when accepted/exhausted/terminal. Persist event expiry and correction intents. Corrections contain no tracking capability. Never endlessly repeat recipients.
- **Output:** auditable escalation timeline and durable jobs.
- **Verify:** duplicate scheduler and simultaneous ACK/promotion, consent withdrawal, primary decline after acceptance, all unreachable, no future job after resolve and complete exhaustion.

### P1-T09 — Build scoped browser tracking and responder controls

- **Owner / paths:** B; tracking module, apps/responder-web/src/app/track/, web tests.
- **Inputs/dependencies:** T06; T08 needed for final ACK wiring.
- **Instructions:** Implement fragment bootstrap, explicit retry-bound exchange, scoped cookies/CSRF, filtered event projection, revision/location polling and terminal revocation. Show accurate age/accuracy/unavailable state, own ACK, anonymous helping count, call/directions. Include expired-grant reissue workflow in owner API/UI integration; no silent renewal. Tile provider configured separately; coordinate/text view works if map fails.
- **Output:** browser-only recipient flow with privacy headers.
- **Verify:** lost exchange response, forwarded/consumed token, two events/tabs, grant/session expiry, IDOR/CSRF/cache/referrer checks, no contacts/history leakage and resolve clears displayed coordinates.

### P1-T10 — Implement native-owned SOS journal, auth and transport

- **Owner / paths:** M; Android auth/journal/location packages, mobile specs/api wrapper.
- **Inputs/dependencies:** G0, T02; generated server fixtures allow work before B endpoints.
- **Instructions:** Persist one encrypted account-bound intent and immutable payload before network. Use Firebase native SDK auth refresh and generated validation/serialization; share journal for manual/native triggers. Implement 5min retry/reconfirmation, outcome-unknown reconciliation, terminate tombstones, account-switch/logout boundaries and process-death restore. Keep sensitive records out of backups/logs.
- **Output:** one durable native transport used by RN and future monitoring.
- **Verify:** process kill at every journal transition, lost response, clock change, offline stop/late create, restart after logout, different account and JS suspended. Never display accepted until confirmed.

### P1-T11 — Build onboarding, contacts and emergency screens

- **Owner / paths:** M; mobile features/{auth,contacts,sos,history,settings}, localization.
- **Inputs/dependencies:** T10.
- **Instructions:** Phone-auth/emulator UI, contextual permissions, contact invitations/status, one-tap SOS, history, own-recipient delivery/ACK states, zero-contact warning and explicit fake mode. 112 opens system dialer with no direct-call/SMS permission. Resolve is deliberate and recoverable from accidental navigation; no manual SOS countdown. Refresh auth once without changing intent.
- **Output:** accessible English/Hindi P0 UI.
- **Verify:** component/contract tests for unavailable location/offline/unknown/expired auth, contact states, double tap and unintended dismiss. TalkBack/48dp/font-scale smoke checks; test call intent without dialing.

### P1-T12 — Prepare provider configuration and controlled conformance

- **Owner / paths:** B; delivery adapters, infra/env examples, docs/validation/provider-register.md.
- **Inputs/dependencies:** T07.
- **Instructions:** Define SMS send/query/receipt capabilities, sender/template/locale rules, credential injection, recipient allowlist and test budget. Use fake transport by default. With supplied permitted resources validate phone-auth/SMS against controlled contacts; record provider accepted/delivery distinction. Record FCM emergency prohibition and leave live push blocked pending a permitted path; never mark push real-provider PASS from fake output.
- **Output:** configuration matrix with MOCK_ONLY/REAL_VALIDATED/BLOCKED per integration and redacted evidence.
- **Verify:** missing credentials fail startup/capability safely, test egress cannot hit live provider, signed receipt mapping, quota exhaustion, secret rotation and cost estimates without invented prices.

### P1-T13 — Add bounded active-event location lifecycle

- **Owner / paths:** M; native location service, mobile active SOS/home state.
- **Inputs/dependencies:** T11.
- **Instructions:** Start location FGS from visible deliberate SOS, use last-known/null immediately and fresh fix asynchronously. Request coarse/fine progressively, label approximate. Aim 10–20s active updates, significant-motion adaptation, retry using same sample IDs, bounded local buffering and native expiry/stop. No background-location permission or boot restart by default. Reflect revoked/degraded/stop-unconfirmed state truthfully.
- **Output:** foreground-service tracking with status/stop lifecycle.
- **Verify:** screen off, home/background, battery saver, GPS off/permission revoke, connectivity loss, process kill, server expiry/resolve; no GPS outside session. Local stop cannot claim remote revocation while offline.

### P1-T14 — Integrate and fault-test the complete P0 path

- **Owner / paths:** B integration lead; M supplies APK/device evidence; contract/API/web/mobile tests.
- **Inputs/dependencies:** T04–T13.
- **Instructions:** Merge frozen contract then migrations/API/worker/web then mobile. Run auth→contact consent→SOS→fake inbox→browser→new location→ACK→resolve. Inject disconnect, provider ambiguity, worker restart and revoked links. Profile local reaction/API queue latency using declared load; no provider/network measurement hidden inside server target.
- **Output:** redacted reproducible G1 evidence bundle and defect list.
- **Verify:** C01–C14 and relevant security/device rows in testing gates; all P0 requirements mapped to evidence. Missing physical/provider evidence is explicit PARTIAL/BLOCKED, not passed.

### P1-T15 — Independently review and record Gate 1

- **Owner / paths:** R; docs/validation/phase-1.md, canonical execution state.
- **Inputs/dependencies:** T14.
- **Instructions:** Inspect diffs/contract hash, reproduce critical tests, review privacy and native claims. Assign bounded fixes to responsible owners. Record local-core and real-provider/device outcomes separately and exact next task.
- **Output:** G1 PASS_LOCAL / PARTIAL / FAIL with independent disposition.
- **Verify:** no open stop-the-line or P0 defect; a local-only pass authorizes P2 fake-mode implementation, never live release.

**Phase tests/failures:** duplicate SOS, internet/GPS loss, stale location, provider failure, no eligible contacts, cannot-assist, accidental dismiss, process death, grant theft/revocation, auth failure and worker restart are required. **Deliverables/DoD:** APK, local API/worker/web, migrations001–006, generated contracts, fake inbox, tests, redacted report and repeatable setup. **Acceptance/exit:** G0 and G1 criteria in testing document; no enrichment dependency, truthful status and scoped access. **Recovery:** roll application back to previous compatible artifact, retain outbox/tombstones and applied migrations; disable a failing adapter without erasing intents. Never replay dead-letter messages blindly or perform destructive down migrations.

## Phase 2 — Intelligent navigation and safe journeys

**Objective/outcomes:** legal walking alternatives with explainable temporal estimates; moderation-backed reports/shops; durable ETA check-in and overdue SOS. **Prerequisite:** G1 PASS_LOCAL; real regional claims additionally require region/data rights. **Database/API:** batches007–009; routes/journeys/reports/shops/admin endpoints. **Integrations:** bounded OSM extract, GraphHopper, configured tiles, optional solar/hour parser; no unknown POI becomes a participant.

### P2-T01 — Prepare phase schema and lock routing feasibility

- **Owner / paths:** B; migrations007–009, infra/maps/, docs/validation/routing-spike.md.
- **Inputs/dependencies:** G1; source protocol16.
- **Instructions:** Create/apply complete phase2 schema batches007–009 in numeric order with migration smoke tests before domain/import lanes; later tasks consume these migrations and never edit applied SQL. Request/record selected polygon if absent, continue fictional graph tests. Pin GraphHopper; verify walking alternatives and edge/time mapping, coordinates, snapping, prohibited paths and1/3/no-route cases. Failed mapping uses disclosed geometry association or approved hosted adapter via CR, not a new routing engine.
- **Output:** phase2 schema baseline, provider conformance evidence, sourced/synthetic distinction and import specification.
- **Verify:** feasible connected/isolated graph cases, segment duration/geometry checks and measured resource footprint. Real pilot remains blocked without choice/data.

### P2-T02 — Import versioned graph, POIs and factor provenance

- **Owner / paths:** B; routing/import modules, migration008, infra/maps/.
- **Inputs/dependencies:** T01.
- **Instructions:** Import graph and POIs idempotently under version/checksum/license/boundary manifest. Map road segments to router version, attach lighting/walkability/assistance sources with confidence and validity. Candidate establishments remain distinct from safe shops. Invalidate import-dependent caches atomically; never reuse edge IDs across graph versions.
- **Output:** reproducible import, GiST indexes and coverage report.
- **Verify:** reimport dedupe, failed-import rollback, lon/lat sentinel tests, access restrictions and source/freshness/coverage queries.

### P2-T03 — Implement routing adapter and normalized candidates

- **Owner / paths:** B; routing/providers and candidate service.
- **Inputs/dependencies:** T02.
- **Instructions:** Fetch up to3 walking alternatives with timeout/circuit breaker; normalize geometry/distance/time/segments. Deduplicate ≥80% shared-length alternatives and disclose fewer candidates; snap endpoints only within configured100m, otherwise return no walking route. Make provider failures distinct from insufficient scoring data; no routing call in SOS.
- **Output:** MapsProvider implementation and fixture-compatible candidate API.
- **Verify:** timeout, disconnected graph, one path, close parallels/bridges, graph mismatch, route start/end and illegal edges. A geometry nearest-neighbor match must not cross bridges or disconnected ways silently.

### P2-T04 — Implement temporal factors and versioned score

- **Owner / paths:** B; routing/factors, scoring and evaluation modules.
- **Inputs/dependencies:** T03; validated datasets from T02, synthetic report/shop fixtures permitted.
- **Instructions:** Apply weights/formula in07 at segment arrival times, solar lighting, structured hours, moderated reports/recency and help/road proxies. Apply quality/freshness-adjusted coverage; unknown=labelled0.5 prior, coverage<0.50→null indicator. Score increases with favorable conditions; lambda1, balanced detour cap30%. Preserve worst-stretch geometry/reasons and disclose candidate-only optimization.
- **Output:** versioned deterministic evaluation and factor explanation.
- **Verify:** monotonicity/bounds, same route16/19/23h, sunrise/midnight/closed shop, unknown/expired data, sparse incident reports, no demographic proxies and detour limits.

### P2-T05 — Validate scoring and source coverage independently

- **Owner / paths:** B prepares docs/validation/route-evaluation.md; R reviews methodology.
- **Inputs/dependencies:** T04.
- **Instructions:** Build a manually checked pilot sample ≥30 segments across ≥3 areas and day/evening periods if permission/data available. Separate held-out observations from weight tuning. Quantify weighted missingness, factor agreement and route-order sensitivity at ±20% weights with renormalization; inspect each unexpected ranking. Do not infer incident reduction.
- **Output:** dated source/coverage/sensitivity report with limitations and fixtures.
- **Verify:** reproducible score explanations and all T-RT rows; absent survey leaves sourced validation blocked, not replaced by synthetic “ground truth.”

### P2-T06 — Implement reports and scoped moderation

- **Owner / paths:** B; reports module, migration009, web/admin report pages.
- **Inputs/dependencies:** T01 phase schema; T04 consumes resulting reports once ready, with fixtures until then.
- **Instructions:** Implement pending intake/mine/withdraw/moderate; PII stripping, category bounds, independent-source dedupe, rate limits and append-only audit. Publish only ≥3 independent-source coarse cells and decay/expiry; invalidate score caches on approval/removal. Admin role does not grant SOS access.
- **Output:** moderated report pipeline and private queue.
- **Verify:** pending has zero score effect, XSS/IDOR, sparse suppression, brigading, duplicate reporter/day, removal/expiry and moderator boundary.

### P2-T07 — Implement shop participation and operating status

- **Owner / paths:** B; shops module, migration009, web/shops and admin shop pages.
- **Inputs/dependencies:** T01 phase schema.
- **Instructions:** Application/listing consent, phone-auth owner, manual verification, hours/exceptions/timezone, pause/withdraw/confirm/close, public projection and radius search. Confirmation lasts≤30min and cannot override closure. Keep verification rubric/actor/time; pending/revoked records never public participants. Emergency shop send remains Phase3 gated.
- **Output:** participant network with transparent schedule/confirmation states.
- **Verify:** stale/overnight hours, verification cannot be self-set, pause/revoke immediate exclusion, listing withdrawal, unsupported hours→UNKNOWN and no owner PII leakage.

### P2-T08 — Build durable journey, sharing and deadline state

- **Owner / paths:** B; journeys module, migration007, scheduler job handlers.
- **Inputs/dependencies:** T01 phase schema; route selection optional until T04, manual ETA works.
- **Instructions:** Implement create/list/detail/location/sharing/arrive/cancel/check-in. Enforce one ACTIVE/OVERDUE journey, explicit auto-escalate choice, default no contact sharing, max12h, versioned ETA/grace120s. Reuse SOS transaction under journey lock with unique source key. Share only selected verified contacts via separate journey grants; escalation revokes them and issues SOS grants.
- **Output:** clock-driven state machine, scoped tracking/journey view.
- **Verify:** row-lock arrival/extend/escalation races, duplicated/restarted scheduler, no push/check-in response, offline stale samples, auto-escalate=false, sourceSOS exactly once and arrival after escalation retains SOS.

### P2-T09 — Integrate journey response and privacy lifecycle

- **Owner / paths:** B; responder web, journeys/retention modules.
- **Inputs/dependencies:** T08.
- **Instructions:** Add recipient journey projection without history/evidence, owner check-in notification intent and explicit arrival/extension semantics. Revoke at completion/cancel/expiry. Ensure process death does not lose server timer; unknown offline cancellation cannot pretend to cancel it. Expired route-evaluation inputs do not delete an active journey reference unexpectedly.
- **Output:** browser journey tracking and recovery evidence.
- **Verify:** old journey link cannot widen to SOS; wrong scope denies; delete/retention jobs preserve necessary foreign keys while purging geometry/coordinates.

### P2-T10 — Implement journey, shops and incident mobile flows

- **Owner / paths:** M; mobile features/{journeys,shops,reports}, location/session registry.
- **Inputs/dependencies:** G1 and G0 generated mocks; live integration needs T06–T09.
- **Instructions:** Build destination/manual ETA, start/arrive/extend/cancel/check-in and active-session restore from GET journeys. Reuse native location service; multiple activeSOS/journey/monitoring consumers use a reference-counted purpose registry so one completion cannot stop another. Build shop list/map/status/call and private report submission/status.
- **Output:** complete mobile P2 workflows with shared-session lifecycle.
- **Verify:** process restart, offline arrive/extend, duplicate taps, stale shop, report pending, revoked contact and journey cancellation while SOS remains active.

### P2-T11 — Implement route comparison and uncertainty UI

- **Owner / paths:** M; mobile features/routes and map wrapper.
- **Inputs/dependencies:** T10; G0 mocks then T04 real API.
- **Instructions:** Render fastest/balanced/lower-estimated-risk roles, geometry, durations, detour, favorable-direction legend, confidence as coverage and explanation/source timestamps. Show fewer alternatives and null scores without invention; user chooses route. Manual SOS and manual-ETA journey stay usable on routing/tiles failure.
- **Output:** accessible English/Hindi route comparison and selection.
- **Verify:**1/3/no candidate, multiple roles same path, 40% coverage, reversed coordinates, stale evaluation, large detour, map outage and text-only alternatives.

### P2-T12 — Review navigation and journey Gate 2

- **Owner / paths:** R; docs/validation/phase-2.md; B/M provide integration results.
- **Inputs/dependencies:** T01–T11.
- **Instructions:** Run temporal route/moderation/shop/journey E2E including overdue exactly once. Inspect data license/coverage and score explanations against inputs. Record functional/sourced-data/provider evidence separately. Reject unsupported real safety or three-route claims.
- **Output/verify:** G2 with R01–R08/J01–J05 gates; defects returned to owner. Missing pilot field data is PARTIAL even if fictional fixture tests pass.

**Deliverables/DoD:** migrations007–009; import manifest; candidate/scoring APIs; moderate reports/shops; journey timers; mobile comparison and sharing; coverage/sensitivity report. **Acceptance/exit:** G2 functional criteria pass; sourced-data gaps disclosed, conditional acceptance only for further local work. **Failures:** bad hours→UNKNOWN; missing data→null score; router failure→manual destination/ETA; provider failure cannot disable overdue scheduler. **Recovery:** disable scoring/import version, revert to prior graph with matched factor version, revoke invalid shop participation, deploy previous compatible app; retain journey jobs/sourceSOS dedupe. Never erase overdue jobs to make tests pass.

## Phase 3 — On-device AI and advanced safety features

**Objective/outcomes:** discreet controls, contextual response/evidence, optional consented proximity, experimental offline inference with measurable limits. **Prerequisite:** G2 local functional pass; datasets/devices/media/shops have separate external gates. **Database/API:** batch010; context/evidence/shop-alert routes, existing contact GPS APIs. **Integrations:** bundled LiteRT, private object storage/quarantine, no background camera or global-key promise.

### P3-T01 — Freeze monitoring lifecycle and native session controller

- **Owner / paths:** M; native monitoring/, specs/, apps/mobile/docs/monitoring-contract.md.
- **Inputs/dependencies:** G2; P1 native transport and session registry.
- **Instructions:** Implement visible start/stop/expiry, mic consent, microphone/location service types as needed, persistent notification, AudioRecord ownership and lifecycle reducer. Share a single audio source for inference and separately consented evidence; inference buffers stay in memory. Revoke/stop releases resources; no boot/process restart or silent mic restart. Motion-only operation must be explicitly labelled, never pretend mic active.
- **Output/verify:** native monitoring shell, consent/degraded UI and lifecycle instrumentation for locked/background/call/revoke/JS-suspended cases.

### P3-T02 — Implement fake call with platform-safe schedule behavior

- **Owner / paths:** M; mobile features/fake-call, native triggers/.
- **Inputs/dependencies:** G2.
- **Instructions:** Immediate/in-app scheduled simulation, configurable label/audio and dismiss. While backgrounded use permitted reminder notification to open simulation; expose schedule precision/notification denial. No privileged full-screen, fake Telecom call or exact-alarm permission by default. Respect real call/audio focus and never trigger SOS implicitly.
- **Output/verify:** offline fake-call flow; tests focused/background/locked/reboot/audio-focus/real incoming call and explicit unsupported presentation.

### P3-T03 — Implement duress PIN and coercion-aware UI

- **Owner / paths:** M; mobile features/pin, native journal/crypto integration.
- **Inputs/dependencies:** G2; P1-T10 transport.
- **Instructions:** Distinct normal/duress PIN verifier, salted memory-hard KDF and Keystore-wrapped secrets; benchmark parameters, attempt backoff and account reset. Duress creates one immediate DURESS_PIN intent then decoy; normal PIN never alerts. No PIN in network/analytics or backups. Use practice mode; explain unavoidable OS/network/recipient exposure. Offline behavior never claims delivery.
- **Output/verify:** decoy/secure setup/reset; wrong/normal/duress/brute force/process death/offline/double-submit/coercer walkthrough tests. PIN never substitutes for API auth.

### P3-T04 — Verify keys, shake and supported alternatives

- **Owner / paths:** M; native triggers/, mobile settings, device support report.
- **Inputs/dependencies:** G2; T01 for monitoring-limited motion.
- **Instructions:** Implement only focused volume sequence through permitted window events with collision timeout/cooldown; test normal volume behavior/accessibility. Add explicit notification action or Quick Settings tile that safely brings UI forward if service start conditions require it. Power-button concept is unsupported and not intercepted. Shake contributes only in activated sessions; no raw vigorous-motion automatic dispatch.
- **Output/verify:** feature flags and foreground/background/screen-off/call/music/headphone matrix; failed/untested global behavior hidden. Alternative controls never imply the app is always listening.

### P3-T05 — Curate licensed, leakage-resistant ML dataset

- **Owner / paths:** M; ml/data/manifests/, private data storage outside Git.
- **Inputs/dependencies:** G2; participant consent/data rights.
- **Instructions:** Collect staged scream, Hindi Bachao, English Help and matched everyday/hard-negative audio/motion. Record license/consent/device/session/noise/language/accent pseudonyms; split by speaker+session+environment before tuning. Preserve held-out data and event annotations; no real victim recordings or personally identifiable public assets.
- **Output/verify:** immutable split/checksum manifest and data card; dataset minima/coverage in testing gates. Missing consent/data blocks model graduation; synthetic smoke examples cannot replace evaluation.

### P3-T06 — Train, calibrate and export an offline baseline

- **Owner / paths:** M; ml/training/, evaluation/, export/, models/.
- **Inputs/dependencies:** T05.
- **Instructions:** Reproducible environment/seeds, audio classifier + motion baseline, compare audio/motion/strict-AND/weighted temporal fusion. Tune only validation data; thresholds/calibration/cooldown versioned separately from model. Export quantized LiteRT with tensor/preprocessing/opset/checksum manifest. Preserve a simple interpretable motion pipeline.
- **Output/verify:** model card, held-out stratified metrics and Python↔quantized parity; training failures recorded, no claim of real assault classification.

### P3-T07 — Integrate LiteRT and sensor fusion natively

- **Owner / paths:** M; native ml/monitoring/, mobile features/monitoring.
- **Inputs/dependencies:** T01, T06.
- **Instructions:** Bundle signed-build model and CPU runtime; 16kHz mono normalized log-mel input as manifest requires, never invent tensor layout. Sample accelerometer target50Hz using monotonic clock; align audio/motion timestamps within documented ±3s window, missing sensors explicit. Default confirmation-only. High-confidence user-opted dispatch uses10s local cancel window then native journal, one intent/cooldown, independent of RN JS.
- **Output/verify:** airplane-mode inference and deterministic fusion replay; suspended JS can still request authenticated SOS when online; no unauthorized evidence upload, no mandatory AND for every distress event.

### P3-T08 — Implement async context and private evidence backend

- **Owner / paths:** B; evidence/sos context modules, migration010, storage/scan adapters, responder media view.
- **Inputs/dependencies:** G2; frozen media contract.
- **Instructions:** Patch timestamped battery/motion; geocode asynchronously with2s timeout. Presign single quarantine object; validate size/hash/magic/MIME/duration, strip metadata and scan before AVAILABLE. Stream only via current recipient+asset scope, audit access, delete/revoke on withdrawal. Manage upload races and purge. No enrichment dependencies in initial dispatch.
- **Output/verify:** evidence state machine and storage fake/conformance suite; expired upload, wrong MIME/hash, malicious file, resolve during upload/read, recipient revocation and no public URL.

### P3-T09 — Evaluate detector, false alarms and device budgets

- **Owner / paths:** M; ml/evaluation/, device benchmark report.
- **Inputs/dependencies:** T07.
- **Instructions:** Execute held-out protocol and ≥30h everyday negatives across speakers/noise/devices; report event-level precision/recall, intervals, false alarms/hour and group support counts. Compare fusion variants and threshold trade-offs; profile60min battery/CPU/memory/latency sessions. Keep auto-dispatch disabled unless all graduation thresholds pass with independent review.
- **Output/verify:** machine-readable evaluation and plots/model card, support matrix. Failed/uncertain metrics produce confirmation-only/disabled result, never a fabricated passing model.

### P3-T10 — Implement explicit foreground evidence capture

- **Owner / paths:** M; native evidence/, mobile context/evidence consent/upload UI.
- **Inputs/dependencies:** T08; T01 only if audio source shared during monitoring.
- **Instructions:** After SOS accepted, allow separately consented ≤10s audio/photo or user-selected ≤10s video in visible foreground. Default no evidence; select recipients explicitly, validate limits locally, upload asynchronously and purge local temporary media. No retroactive upload of inference buffers, automatic background camera or evidence retry after consent withdrawal.
- **Output/verify:** permission/revocation/call/process-death/upload-expiry/media-delete cases; initial SOS latency independent of capture/storage/geocoder.

### P3-T11 — Integrate eligible responder proximity, ETA and shop alert gate

- **Owner / paths:** B; contacts/sos ranking/tracking/shops modules and responder web.
- **Inputs/dependencies:** G2; P1 contact GPS; T08 migration010 for shop alerts.
- **Instructions:** Validate nearest among trusted consented fixes≤5min/accuracy≤100m with priority tie-break; never re-rank into random users or expose contact GPS to owner. Implement scoped POST tracking/navigation for voluntarily provided transient responder origin; declining leaves tracking usable. Enable shop alert only per active agreement plus event-specific user selection; shop scope15min, no evidence/contact list.
- **Output/verify:** primary fallback/ETA context and gated shop receipt; unreachable contact, stale GPS, no geolocation permission, shop pause/withdraw and wrong-scope tests. No agreement→FEATURE_DISABLED.

### P3-T12 — Integrate advanced features and abuse tests

- **Owner / paths:** B integration lead, M device lead; docs/validation/phase-3-evidence.md.
- **Inputs/dependencies:** T01–T11, including explicitly recorded experimental fallback dispositions.
- **Instructions:** Duress/native triggers→same SOS pipeline; media/geocode failures must not delay basic alert. Test normal PIN, false detections/cancel, accidental dismissal, consent withdrawal, combined monitoring+journey+SOS and independent stop/refcount. Exercise observer coercion/privacy cases without claiming concealment.
- **Output/verify:** advanced E2E and flag-default manifest; E01–E08/M01–M08 gates with experiment failures labelled accurately.

### P3-T13 — Independently review Gate 3 and feature disposition

- **Owner / paths:** R; docs/validation/phase-3.md, state/decisions.
- **Inputs/dependencies:** T12.
- **Instructions:** Inspect model/data licenses, statistical evidence, native/background claims and media access. Assign each experiment VERIFIED_LIMITED / CONFIRMATION_ONLY / DISABLED / BLOCKED_EXTERNAL with reason. Fake PIN and fake call remain committed requirements with supported fallbacks; do not call a broken committed feature an experiment.
- **Output/verify:** G3 core-advanced result plus separate ML auto-dispatch gate; no unsupported feature enabled. P4 may harden an honest disabled experiment without claiming ML graduation.

**Deliverables/DoD:** batch010; fake call/PIN; native monitoring; model/data/evaluation cards; gated key/shake/AI; context/evidence; eligible matching and shop policy. **Acceptance/exit:** G3, experimental outcomes explicit; offline model works on supported devices if enabled, no capture outside consent. **Failures:** sensor unavailable→degraded/confirmation/manual; recording/storage failure→no evidence, SOS continues; no contact GPS→priority. **Recovery:** rollback signed app/model together to compatible manifest, kill-switch future automatic triggers, stop mic and preserve existing SOS. Server flag alone cannot immediately reach an offline device: bundled safe defaults/session expiry remain necessary. Never disable manual SOS during rollback.

## Phase 4 — Integration, reliability and final delivery

**Objective/outcomes:** independently reviewed reproducible controlled release, measured reliability, privacy lifecycle, device support and honest demo. **Prerequisites:** G3 and explicit experiment dispositions; live mode additionally requires R01–R09 in risk register. **Database/API:** batch011 privacy export/delete; additive fixes via reviewed CR only. **Integrations:** isolated staging/live accounts only with permitted resources, budgets and operational ownership.

### P4-T01 — Run security review and authorization regression

- **Owner / paths:** R accountable for review/report; B fixes server/web and M fixes mobile in their owned paths.
- **Inputs/dependencies:** G3.
- **Instructions:** Exercise threat model11: IDOR, token theft, CSRF/XSS/injection, role escalation, invitation/shop abuse, media exfiltration, PIN/Keystore backup and secret leakage. Audit dependency advisories/SBOM, TLS/CSP/CORS/cache headers and provider signatures. Scope fixes by ownership and CR.
- **Output/verify:** no open critical/high exploitable finding; meaningful negative authorization tests and redacted remediation evidence.

### P4-T02 — Complete account export, deletion and restore erasure

- **Owner / paths:** B; privacy module, migration011, retention jobs, mobile settings consumes APIs.
- **Inputs/dependencies:** G3.
- **Instructions:** Recent-auth export/deletion jobs; active-sharing explicit resolution before deletion, revoke credentials/sessions, encrypted private export TTL24h. Purge all copies including initial GPS/context, journey destinations, route evaluations, outbox material, media and local device records; preserve minimized deletion ledger for backup reconciliation. No export of contacts' GPS or unrelated private data.
- **Output/verify:** delete/export ownership/idempotency, failed-job resume, storage purge,30d backup expiry and restore re-purge; mobile displays actual job status.

### P4-T03 — Validate permitted providers and production configuration

- **Owner / paths:** B/deployment owner; infra/, provider register/runbook.
- **Inputs/dependencies:** G3 and supplied credentials/permission/budgets for live rows.
- **Instructions:** Verify phone OTP, authorized SMS and any permitted push channel using allowlisted consenting recipients. Capture receipts/acceptance/latency/quota semantics. Confirm geo/media host terms, storage region and secret rotation. FCM emergency sending stays blocked absent applicable written permission/change; provider decision never inferred from time elapsed.
- **Output/verify:** real-provider matrix and cost model; absent resources BLOCKED_EXTERNAL, controlled release stays mock. Sandbox success ≠ handset delivery.

### P4-T04 — Execute real Android reliability and accessibility matrix

- **Owner / paths:** M; apps/mobile/docs/device-matrix.md.
- **Inputs/dependencies:** G3; ≥2 physical devices.
- **Instructions:** Run targetAPI36/minAPI29 support cases, locked/background/Doze/battery saver/OEM kill/network/GPS/coarse permission/notifications/calls/reboot/force-stop. Test TalkBack, font scale, one-hand controls, English/Hindi message review and duress caveats. Verify16KB emulator/native ABI and signed release build, not only debug.
- **Output/verify:** per-device OS/build/permissions/observations and videos with synthetic data. Unsupported modes disabled/labelled; no claim of continuous monitoring through force-stop.

### P4-T05 — Profile load, latency, battery and provider costs

- **Owner / paths:** B accountable for performance report/server load; M supplies device energy evidence; R accepts.
- **Inputs/dependencies:** G3; P4-T04 device availability for energy.
- **Instructions:** Declared staging load100 activeSOS, polling/update cadence and10 new creates/min; ensure SOS priority over route/import work. Measure p50/p95/error/outbox lag and location end-to-end age. Compare matched60min sessions idle/location/audio+motion, repeated3 times/device, report CPU/RSS/energy and thermal conditions. Price usage from dated actual tariffs only.
- **Output/verify:** quantitative results against gates; no invented result or universal battery percentage from a single device.

### P4-T06 — Harden deployment, telemetry and recovery

- **Owner / paths:** B; infra/compose, deploy/CI, logging/metrics/runbooks.
- **Inputs/dependencies:** G3; T01 security findings incorporated.
- **Instructions:** Build immutable API/worker/web artifacts, HTTPS same-origin reverse proxy, private DB/storage/router, readiness/graceful shutdown, least-privilege secrets and budget caps. Monitor outbox age, DEAD jobs, overdue lag, receipt failures, stale position and degraded monitoring without raw personal data. Back up/restore and exercise previous-version application rollback with compatible migrations.
- **Output/verify:** staged deployment/restore/rotation drill and alert tests. No unattended publish to a new paid/public environment; credential/spend decision blocks only that action.

### P4-T07 — Run emergency failure and recovery campaign

- **Owner / paths:** B integration lead; M mobile failure evidence.
- **Inputs/dependencies:** T05, T06.
- **Instructions:** Execute full SOS through DB outage, worker crash after provider call, SMS failure, no push, contact rejection, GPS loss, lost create response, user stop offline, provider recovery/replay and journey scheduler restart. Verify stale data/status are explicit and no hidden dispatch after termination.
- **Output/verify:** C/J/security fault matrix, recovery times and no unresolved critical-path failure. Provider ambiguity documented even when delivery duplicate cannot be eliminated externally.

### P4-T08 — Finalize user/operator and academic documentation

- **Owner / paths:** B setup/deployment; M device/user instructions; R claims review; README and docs15/18/20.
- **Inputs/dependencies:** T01–T04 results, T05 measurements.
- **Instructions:** Document exact install/build/test/restore/continuation commands, support matrix, privacy/consent/retention and provider limitations. Prepare demo fixtures/video/viva using actual results, synthetic labels and no real112 calls. Verify any competitor claim against official current evidence or leave UNKNOWN. Include shop verification/abuse response owner.
- **Output/verify:** clean-checkout reproducible runbook and evidence-linked presentation, no unsupported police/safety/delivery/ML claim.

### P4-T09 — Release rehearsal and complete acceptance trace

- **Owner / paths:** B integrates; M release APK; R observes.
- **Inputs/dependencies:** T01–T08.
- **Instructions:** Fresh environment migration/seed/build, signed artifact checksum, complete mobile→API→provider-mode→browser→resolve run, route/journey/shops/moderation/discreet/monitoring fallbacks. Reconcile every PRD ID to evidence and every external prerequisite to disposition. Disable test inbox in pilot, keep separate safe demo deployment.
- **Output/verify:** release candidate bundle and deterministic reproduction; no missing committed feature silently marked passed.

### P4-T10 — Independent final gate and delivery

- **Owner / paths:** R; docs/validation/phase-4.md and EXECUTION_STATE.md.
- **Inputs/dependencies:** T09.
- **Instructions:** Inspect final diff, hashes, tests, limitations, deployment permissions and outstanding blockers. Issue PASS_CONTROLLED_DEMO, PASS_PILOT or PARTIAL/FAIL separately. Live approval requires provider/device/privacy/operations gates; no local test can substitute.
- **Output/verify:** versioned delivery links/artifacts, final report and next actions with owners; implementation complete only within explicitly stated accepted scope.

**Deliverables/DoD:** batch011; signed APK; reproducible server/web; SBOM/config/restore documentation; privacy jobs; verified evidence and final report. **Acceptance/exit:** G4, every committed requirement has test evidence or explicitly unresolved blocker, all excluded features remain absent. **Recovery:** roll back application/model compatible versions, suppress future unsafe jobs without dropping audit, revoke compromised grants/keys, restore then reapply erasure ledger; communicate degraded service truthfully. Rerun only affected and critical regression gates after changes.

## Requirement-to-task coverage

| PRD IDs / additional obligation | Primary tasks / gate |
|---|---|
| AUTH-01 | P1-T04/T11/T12; G1, real-auth row |
| CONT-01 | P1-T05/T11; G1 |
| CONT-02 | P1-T06 ranking fallback; P3-T11 proximity/ETA; G3 |
| SOS-01, SOS-02, SOS-03, SOS-04, SOS-07 | P1-T06–T14; G1 |
| SOS-05 | P3-T08/T11; G3 |
| SOS-06 (audio/photo/optional video) | P3-T08/T10; G3 evidence conditional gate |
| CALL-01 | P1-T11; G1 |
| JOUR-01, JOUR-02 | P2-T08–T10; G2 |
| ROUTE-01, ROUTE-02, ROUTE-03 | P2-T01–T05/T11; G2 |
| REPORT-01, REPORT-02 | P2-T06/T10; G2 |
| SHOP-01, SHOP-02 | P2-T07/T10; G2 |
| SHOP-03 | P3-T11; G3 conditional agreement gate |
| FAKE-01/PIN-01 | P3-T02/T03; G3 committed features |
| KEY-01, MOT-01, ML-01, ML-02 | P1-T02; P3-T01/T04–T09; G3 experiment dispositions |
| ADMIN-01 | P2-T06/T07; G2 |
| OFF-01/IOS-01 / original power-trigger concept | excluded/no implementation; power gesture unsupported rationale P3-T04 |
| Security/privacy/deployment/observability/performance | every phase plus P4-T01–T07; G4 |
| Interruption/agent coordination/contracts | P1-T01/T03, every checkpoint, ownership/state/handoff docs |

## Continuous execution and recovery protocol

Use [EXECUTION_STATE_TEMPLATE.md](EXECUTION_STATE_TEMPLATE.md) to create root EXECUTION_STATE.md at P1-T01. It is authoritative; IMPLEMENTATION_STATUS.md is a generated/read-only summary for legacy readers. One designated writer integrates B/M entries. Before each task: read current branch/status/state/contract hash; validate prerequisites, owner and uncommitted work; mark IN_PROGRESS with start commit. After each meaningful batch and before interruption: write files/commands/exit codes/evidence mode/decisions/blockers, mark task state, set exact next executable task and preserve pending processes/leases. Never include credentials/PII.

On resume: read docs/state, inspect actual Git diff and running processes, reconcile partial artifacts/migration ledger/outbox, rerun only missing/affected verification, then continue the earliest dependency-ready task in the assigned lane. “File exists” is not DONE. Failed commands remain failed until a recorded rerun passes. Context exhaustion is a checkpoint, not a reason to restart planning or seek routine approval.

If externally blocked, record resource/owner/affected task/fallback and continue independent work. Stop affected work only for unavailable credentials/devices/data, financial approval, unresolved product/security changes or unavailable external resources. Ask for a concrete missing decision after preparing reviewable fixtures/config/estimate. Never infer permission from delay, and never use fake results to close real-provider/device gates. Reviewer acceptance is a recorded handoff, not human confirmation between routine tasks.

Required task states: NOT_STARTED, IN_PROGRESS, IMPLEMENTED_UNVERIFIED, DONE, FAILED, BLOCKED_EXTERNAL, DISABLED_EXPERIMENT. A disabled experiment needs gate disposition and cannot stand in for a committed requirement. Task dependency is satisfied by DONE; an explicitly accepted experimental fallback may satisfy only that named experimental dependency.

Phase report fields: phase/baseline/branch+commit; requirement/task results; changed files/migrations/contracts; exact commands+exit codes+artifact paths; mock/sandbox/real-provider/physical-device mode; measured metrics; security/privacy results; failed/skipped/blocked cases; experiment dispositions; independent reviewer decision; rollback artifact; outstanding blockers/owner; next task. Full fillable form is in the state template.

## Required command surface for P1-T01

These are future scripts the scaffold must provide, not commands claimed to exist or pass now: npm ci; npm run lint; npm run typecheck; npm run contracts:check; npm run test:unit; npm run test:integration; npm run test:contract; npm run test:web; npm run test:mobile; npm run test:e2e; npm run build; npm run db:migrate; npm run seed:demo; npm run dev; npm run verify:docs. Integration/e2e scripts start isolated PostGIS/Auth emulator/fake adapters and cannot reach real providers. Mobile release/device scripts document required Android SDK and never silently skip a missing device.

P2 adds test:routing and test:journeys. P3 adds ml:evaluate and test:monitoring plus native instrumentation. P4 adds test:security, test:load and restore:verify. Each reports zero/nonzero meaningfully; “skipped because unavailable” is distinct evidence. CLI syntax is documented for Windows PowerShell and CI Linux; no shell-specific destructive cleanup.
