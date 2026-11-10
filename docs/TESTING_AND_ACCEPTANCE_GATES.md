# Testing and acceptance gates

Baseline review-1.2. **All criteria below are planned targets; no application tests or benchmarks have been executed by this review.** [13_TEST_PLAN.md](13_TEST_PLAN.md) retains the test taxonomy and legacy test IDs; this document owns measurable gates and evidence classification. Tasks/owners are in the [master plan](EXECUTION_MASTER_PLAN.md).

## Evidence rules and environments

Each result records task+requirement+test ID, commit/contract/model/data version, command/exit code, UTC run time, environment, fixture/seed, expected/actual, artifact path and responsible owner. Never store real phones/GPS/audio/tokens in reports. Synthetic fixture tests and private real data stay separated.

Evidence modes: STATIC_REVIEW; MOCK (emulated/fake); SANDBOX (provider test service); REAL_PROVIDER (allowlisted consenting recipients and configured project); EMULATOR; PHYSICAL_DEVICE (model/OS/build/target SDK/permissions/battery mode). A provider accepting a request does not prove delivery; receipts and human ACK have separate rows. A screenshot or emulator does not prove background device behavior. For real-provider samples report observed delay/counts/failures, not guaranteed delivery.

B owns DB/API/worker/web tests; M owns components/native/model/device tests. Both own their side of generated-contract tests; R independently checks critical failures, evidence and gates. CI uses isolated PostGIS and Auth emulator with network egress denied to real delivery/storage. Instrumented recordings/dialer tests require deliberate test setup; never dial112 or send uncontrolled distress messages.

Use unit tests for domain reducers/time/score/consent; DB integration tests for locks/constraints/PostGIS/migrations; contract tests for generated serialization/error/nulls; mobile components for status/consent; browser tests for auth/scope; native instrumentation/device sessions for lifecycle. Tests must exercise failure behavior, not mirror implementation. Stop-the-line failures from AGENTS always fail the gate.

## G0 — before parallel feature implementation

All must pass: supported root/mobile skeleton builds; exact dependency/toolchain lock; complete OpenAPI3.1 success/error/security catalogue and nested schemas; generated TS/validators/native serialization; positive and negative fixtures; provider boundaries; migration sequence; consent/state/version policy; M compatibility review and R freeze hash. Reject placeholder schemas, unknown properties, mismatched units/enums, multiple migration owners or hand-maintained duplicate clients. G0 is not an application acceptance test.

## Critical SOS scenarios — G1 and regression every phase

| ID | Scenario | Pass criterion |
|---|---|---|
| C01 / T-SOS-01 | Deliberate manual SOS | one intentional action; native intent persisted before network; no geocode/media/model/router wait; event+recipients+outbox atomically committed |
| C02 / T-SOS-02 |5 concurrent identical creates | one event/recipient snapshot/initial logical intent per eligible channel; all replies same event; mismatched immutable payload409 |
| C03 / T-SOS-03 | No/old/coarse/malformed GPS | null/labelled old/coarse sent correctly; valid SOS not blocked by absent GPS; invalid optional point omitted by client; API rejects malformed supplied point |
| C04 / T-SOS-04 | Offline, request timeout and auth refresh | unsent vs unknown distinguished; same UUID/payload after refresh; no retry beyond5min without reconfirmation;112 dialer available |
| C05 | Offline stop / late create / account switch | same intent lock/tombstone prevents dispatch after termination commits; no cross-account replay; remote stop remains unconfirmed while offline |
| C06 / T-SOS-05 | Provider fail/429/ambiguous outcome | bounded retries, leases and attempts survive restart; no accepted-as-delivered; unknown reconciled or bounded ambiguous retry with duplicate risk recorded |
| C07 | Worker crash/2 workers/DB rollback | no orphan event/outbox transaction; logical send dedupe, expired lease recoverable; kill-after-send does not invent exactly-once physical delivery |
| C08 / T-SOS-06 | Browser without app | explicit scoped exchange, filtered snapshot and current-or-labelled-stale location; successful updates with no receiver install |
| C09 / T-SOS-07 | Resolve/revoke/expiry | new reads/ACK/media denied immediately server-side; browser clears private state on next response; local capture stops≤2s after stop command where process active |
| C10 / T-SOS-08 |0/1/5 contacts, no contact GPS | SOS persists even zero; all verified contacts initially selected; deterministic priority fallback; no inferred arbitrary location |
| C11 / T-SOS-09 | Cannot help/no ACK/changes ACK | primary promotion at30s or immediate rejection, within scheduler lag budget; unique promotion/contact, stop at acceptance/exhaustion/terminal |
| C12 | Accidental dismiss/cancel/resolve race | navigating away never cancels SOS; cancel wins only prelease; resolve allowed from all nonterminal states; message recall never claimed |
| C13 / T-SEC-01 | Auth/scope/consent abuses | cross-owner404, wrong invited phone denied, withdrawn consent revokes access, no role injection, CSRF/signature/replay checks |
| C14 / T-AUTH-01 | Identity/session/token lifecycle | expired/wrong-project/forged ID token denied; refresh once; privileged revocation checked; emulator config refused outside local; two grants/tabs cannot share scopes accidentally |

Additional contact tests: concurrent cap≤5, blocked invites not resent, re-consent only by invited principal, phone edits cannot reuse verification, contact GPS erased at expiry, installation token cannot be hijacked.

**Latency/load baseline:** local SOS tap reaction<1s p95 over≥30 trials/device; API commit+enqueue p95<3s over≥500 creates at declared staging load, no external provider time included. Phase1 minimum20 concurrent activeSOS; Phase4 target100 activeSOS and10 new creates/min with polling/location traffic for≥30min. Report machine/DB/network and error rates; zero lost committed intents and zero duplicate logical intents. A failed target requires measured bottleneck/correction, not reduced unreported load.

Connected activeSOS: intended10–20s samples, server accepts at most1/5s; portal visible polling10s. Target server-receive→visible p95≤15s and capture→visible p95≤40s in controlled connected tests. CURRENT requires age≤60s, accuracy≤100m; fresh coarse/unknown accuracy is APPROXIMATE; older STALE; null UNAVAILABLE. Do not require GPS accuracy the hardware cannot provide; require honest labeling and measured distribution. No update outside explicit active session; local buffering bounded.

Scheduler/outbox targets under declared healthy staging load: p95 due/queue lag≤5s; worker outage tests recover pending work within30s after process restart, without resetting due times. Alert operations report provider delay separately. Metrics counters/retention support these assertions.

## Navigation, data, moderation and shops — G2

These R-series IDs are testing scenarios, distinct from the external R-series risk register.

| ID | Scenario | Pass criterion |
|---|---|---|
| R01 / T-RT-01 | Time awareness | expected segment traversal times drive solar/hours/report factors; same OD at16/19/23h changes only when relevant source features change |
| R02 / T-RT-02/06 | Missing/expired/low-quality data | unknown is not “unlit” or “safe”; effective weighted coverage<0.50→null score; independently verify cutoff boundary |
| R03 / T-RT-05 | Score/explanation validity | weights sum1, bounded0–100, favorable-direction monotonicity, published version; reasons match actual factors, confidence labelled coverage |
| R04 / T-RT-07/08 | Walking routes/alternatives | no prohibited/closed edge in fixtures; geometry/edge version aligned, candidate dedupe, detour cap30%,1/0 paths honestly disclosed |
| R05 / T-RT-04 | Reports abuse | pending has zero effect; duplicate source capped; counts<3 suppressed; no exact household/report location public; approve/remove/expiry invalidates score |
| R06 / T-RT-03 | Shop freshness and consent | only verified ACTIVE participants public/rankable; paused/revoked/closed excluded from expected-help factor; confirmation expires≤30min; schedule never guarantees open |
| R07 / T-RT-09 | Independent data validation |≥30 segments across≥3 areas and day/evening; dated survey/rights, weighted coverage by area/time,±20% weight sensitivity and inspected ranking changes |
| R08 | Provider/tiles/import failure | router timeout5s, map or scoring failure preserves manualSOS/manualETA; no fake routes; import rollback preserves matching data version; attribution/policy checked |

| ID | Journey scenario | Pass criterion |
|---|---|---|
| J01 | ETA/grace/deadline update | server UTC check-in atETA, escalation after120s; version change invalidates old job; unique active journey enforced |
| J02 | Arrival/extension vs overdue worker | same row lock yields one authoritative result;50 repeated interleavings each; at most one sourceSOS; arrival after escalation does not resolve it |
| J03 | Process death/offline/no check-in delivery | server timer survives; list/detail restores app state; failed reminder cannot suppress configured escalation; offline cancel visibly unconfirmed |
| J04 | Independent sharing/auto-escalation | default sharing off, explicit contacts; auto-escalate=false creates no automaticSOS; NEED_HELP creates immediate linkedSOS |
| J05 | Scope/expiry/concurrent sessions | journey token never readsSOS/evidence; arrival/expiry revokes; completing journey cannot stop activeSOS/monitoring location consumer |

Routing validation proves a proxy model is reproducible and honest, not crime prediction. Seeded shops/reports and surveyed data are distinct evidence.

## Advanced features and media — G3

| ID | Scenario | Pass criterion |
|---|---|---|
| E01 | Fake call | works offline in app; background reminder limitations explicit; dismissible; real calls/audio focus respected; zero unintendedSOS |
| E02 | Normal/duress PIN | distinct verifiers, rate limits, Keystore storage; normal0SOS, duress1 intent/decoy; no PIN in logs/network/backup; lost response uses same intent |
| E03 | Coercion/offline duress | no claim of guaranteed concealment/delivery; notification preview/OS indicators tested; authenticated resolution/recovery works |
| E04 | Volume/shake/power concept | focused-key matrix measured; background/screen-off never claimed from focused success; no Accessibility/media-session/power hijack; shake only in active session |
| E05 | Enrichment | injected60s media/geocoder stall is not awaited by initialSOS transaction; initialAPI p95 remains<3s under declared load, context independent/stale-labelled; provider payloads contain no sensitive context |
| E06 | Evidence permissions/upload/scan | explicit capture consent/recipient selection;≤10s audio/video; foreground camera; malicious/wrong size/hash/MIME rejected; quarantined never viewable |
| E07 | Evidence authorization/erasure | other recipient/moderator/shop denied; revoke/resolve/delete midupload/read stops access; private bucket anonymous denial; no public read URL; local temp media purged |
| E08 | Eligibility/ETA/shop response | only trusted fresh consentedGPS rank; fallback priority; responder origin optional; no agreement/user choice means no shop send; shop scope cannot read evidence |

## ML/native graduation protocol — G3 separate from committed features

M owns measurement; R reviews immutable test manifest and model checksum. The existing ≥2h negative example in08 is a smoke test only.

Dataset minimum for a graduation attempt:≥40 consenting speakers with speaker-disjoint24/6/10 train/validation/test allocation; additional environment and recording-session separation documented. Held-out test≥150 annotated events for each scream, Hindi Bachao and English Help class, spread across held-out speakers/devices/noise, with≥3 held-out acoustic settings and matched ordinary/help-in-conversation negatives. Collect≥30h everyday negative audio+motion,≥10h/device across≥2 phones. Motion positives are staged movement patterns, never evidence of actual violence. If unavailable, record BLOCKED/confirmation-only and no automatic-dispatch claim.

Use event-level matching: one prediction within0–5s after an annotated event starts counts once; duplicates and misses explicit. Group adjacent high-confidence windows within10s into one episode; report false episodes before and after120s operational cooldown so cooldown cannot hide a poor classifier. Frozen thresholds come from validation set; never tune on test. Report per-class/language/noise/device precision/recall/F1/support, confusion matrix, calibration, missed events, false episodes/hour, detection-delay distribution and95% intervals. Precision on staged prevalence is not population precision.

| ID | Criterion | Threshold/disposition |
|---|---|---|
| M01 | Data rights/split leakage | every asset consent/license/checksum; zero speaker/session overlap; test locked before threshold tuning |
| M02 | Held-out event performance | for auto-dispatch attempt per-class recall≥0.90 and95% Wilson lower bound≥0.85; event precision≥0.90 on stated test mix; report every stratum, no unsupported-group claim |
| M03 | False alarms | one-sided95% Poisson upper bound≤0.10 false high-confidence episodes/hour; with zero alarms≥30h needed (−ln0.05 / hours). Nonzero alarms require more exposure or improved model; no “0% false alarms” claim |
| M04 | Fusion benefit/limitations | audio-only/motion-only/AND/fusion/confirmation compared on identical held-out events; adopt fusion only if trade-off justified; no requirement for both signals in every emergency |
| M05 | Conversion/runtime | bundled model≤10MiB target; same preprocessing/tensors/checksum;≥99% decision agreement float-vs-quantized on held-out set, divergences reviewed; offline2 phones |
| M06 | Device performance | p95 inference≤200ms/window on lowest supported test phone; incremental native RSS≤100MiB target; no unbounded buffer/wake lock, crash/ANR or thermal-throttling instability |
| M07 | Energy | matched60min idle/location-only/audio+motion runs,3 repeats/device, report battery/CPU/RSS/thermal; provisional extra monitoring drain≤10 battery percentage points/hour over location-only. If exceeded disable auto mode until budget resolved |
| M08 | Lifecycle/dispatch | visible start, typedFGS, stop/revoke≤2s resource release, lock/call/kill/notification-denial matrix, no silent restart; suspendedJS native intent reachesSOS when authenticated/online |

These budgets are reviewer-selected prototype criteria, not safety certification. Meeting them allows only a limited supported-device experimental setting after explicit user activation/opt-in. Default confirmation-only; manualSOS never depends on ML. If intervals/data/device metrics fail or remain uncertain, automatic dispatch stays disabled. Offline monitoring cannot cause server delivery without connectivity; journal status remains truthful.

## Security/privacy/operations — every phase, completed at G4

Required suites: forged/expired/wrong-project tokens; client-injected roles/owner; IDOR per route and projection; cookies/CSRF/CORS/CSP; grant forwarding/exchange replay/expiry/multiple tabs; query/body/header logging redaction; provider signature/replay; SQL injection/XSS; account removal during active dispatch; revoked media; report brigading; shop impersonation; native PIN/Keystore/backup handling. Every new sensitive endpoint adds a negative authorization case.

Retention tests advance fake clock to boundary and beyond: detailedSOS/journey locations and duplicated coordinates purge terminal+24h; summaries/dedupe30d; evidence≤7d; contactGPS session end; route-query inputs24h; pending reports30d; approved report features90d; access/audit90d; backup30d; export24h. Immediate access revocation never waits for purge. Purge jobs complete within1h after retention boundary in normal operation. No precise coordinate/media survives in event-summary/context/request-body copies. Restore must reapply deletion ledger before serving traffic.

G4 includes encrypted backup restore, previous-compatible-version deploy rollback, secret rotation, dead-letter investigation, expired lease recovery and metrics alarms. Planned controlled-pilot recovery objectives: DB RPO≤15min with supported managed backup/WAL configuration, RTO≤60min in rehearsal; plain daily dumps do not establish RPO15min. Record actual results and adjust deployment capability before pilot; never claim no data loss. Local demo may use weaker documented backups.

## Gate decisions and waiver policy

| Gate | Required acceptance | External/conditional boundary |
|---|---|---|
| G1 | C01–C14, P0 contracts/integration/privacy; mockE2E and builds; named device/provider rows recorded | PASS_LOCAL authorizes next local phase; AUTH/SMS/push/device real rows remain blocked until evidenced |
| G2 | R01–R08/J01–J05 functional cases; no fabricated score/routes; report/shop scopes | PASS_LOCAL with synthetic fixtures allows next local phase; region/survey absent means sourced validation PARTIAL |
| G3 | E01–E08 committed cases and safe conditional fallbacks; native lifecycle evidence | ML auto graduation M01–M08 separate; disabled experiment recorded; unavailable live media/shop integration not passed |
| G4 | all committed functional gates, security/privacy/performance/restore/docs, reproducible rehearsal | PASS_CONTROLLED_DEMO can be synthetic and must say so; PASS_PILOT also needs real providers, devices, region, rights, policy/operations and no unresolved blocker |

PASS_LOCAL does not mean the entire phase is fully validated: report overall PARTIAL if external rows remain. FAIL stops dependent feature expansion. No routine human confirmation; R records gate review. A reviewer may accept a named experimental fallback but cannot waive consent, exposedGPS/media, missing auth, delayedSOS or false delivery status. Missing committed feature remains incomplete. A high/critical security or emergency correctness defect blocks release. Every conditional acceptance names scope, limitation, owner and retest trigger.

Regression schedule: C-critical/contract/authorization tests on every relevant commit; phase-specific integration before gate; real-device recheck after native/targetSDK/model changes; provider conformance after adapter/credentials/template changes; complete rehearsal atG4. Do not rerun unrelated expensive suites after accepted evidence unless changes/failures justify it.
