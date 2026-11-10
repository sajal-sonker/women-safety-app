# 13 — Testing, evaluation, release gates and safety acceptance

**No feature is 'complete' solely because a screenshot works.** Evidence must include automated tests plus real-device tests for Android platform-dependent features. Use mock numbers and test mode; never send a real police alert during testing.

Review-1.2: this file retains the taxonomy and legacy test IDs. [TESTING_AND_ACCEPTANCE_GATES.md](TESTING_AND_ACCEPTANCE_GATES.md) is authoritative for exact thresholds, new recovery cases, evidence modes and gate dispositions. Three route roles do not require three invented distinct paths; topology exceptions must be disclosed. Two hours of ML negatives is only a smoke test, not graduation. No application tests have run in this planning review.

## Test pyramid

- **Unit:** validation, time zone conversion, timers, scoring, confidence, enrichment, contact ranking, authorization predicates, token expiry, state transitions, debounce, fake PIN validation.
- **Integration:** Postgres migrations, PostGIS nearest queries, SOS+outbox atomic transaction, provider adapter status, Web portal scoped grants, incident moderation, shop opt-in, journey deadline job.
- **Contract:** same JSON schema fixtures across React Native/Express/Next.js; idempotency, partial/null location, errors and API version.
- **End-to-end:** mock Firebase OTP → add contact → manual SOS → mock SMS link → responder opens → receives position → acknowledges → user resolves → link revoked.
- **Device:** at least 2 physical Android devices, multiple OS versions if available; test permission/lock/background/battery constraints honestly.
- **Adversarial:** IDOR, leaked token, no GPS, offline mode, duplicate jobs, provider fail, stale contact GPS, false reports, shop imposter, coerced fake PIN, media exfiltration.

## P0 critical acceptance matrix

| Test ID | Scenario | Pass condition |
|---|---|---|
| T-SOS-01 | one-tap manual SOS | durable event+outbox created; UI latency target measured; no enrichment dependency |
| T-SOS-02 | 5 parallel duplicate requests | exactly one event, no duplicate initial recipient notification intent |
| T-SOS-03 | no GPS | event still created, location unavailable/stale label accurate |
| T-SOS-04 | no network | clearly `not sent`, visible 112 call option; never falsely 'delivered' |
| T-SOS-05 | provider timeout | retries with bounded backoff and recorded status; no unbounded spam |
| T-SOS-06 | web recipient without app | authorized short-lived grant shows event and new points |
| T-SOS-07 | link after resolution | denied/revoked; no continued location sharing |
| T-SOS-08 | contact rank unavailable | predefined priority fallback; no guessed GPS |
| T-SOS-09 | recipient cannot help | escalation promotes next contact; no loss of initial alert |
| T-SEC-01 | other user queries event | denied; no sensitive fields returned |
| T-AUTH-01 | expired Firebase ID token | rejected; client refresh path tested |

## Geospatial/routing test matrix

| Test ID | Scenario | Pass condition |
|---|---|---|
| T-RT-01 | same route at 16:00 vs 23:00 | time-sensitive features recomputed at segment traverse time; explanation changes if source data changes |
| T-RT-02 | missing lighting tag | neutral prior + lower confidence, no claim 'unlit' or 'safe' |
| T-RT-03 | few verified shops vs many | shop-gap factor responds and confidence assessed |
| T-RT-04 | 1 malicious new incident | pending report has no immediate approved-score effect |
| T-RT-05 | conflicting factors | score remains [0,100], weights=1, reason list corresponds to computed factors |
| T-RT-06 | 40% source coverage | conservative warning and `risk_indicator:null` by proposed policy |
| T-RT-07 | blocked/illegal walkway | candidate must exclude illegal/closed edges even if score high |
| T-RT-08 | large detour | balanced recommendation enforces configured detour cap |
| T-RT-09 | bias study | report missingness by geography and time; no demographic proxy as evidence of crime |

## Safety monitoring / stealth real-device cases

- Audio-only scream vs simulated shouting/television; shake-only vs potholes/jogging; fusion variants; no rigid AND claim. Calculate precision, recall, per-class F1, false alarms/hour and missed positive samples on separated participants/environments.
- Foreground start while app visible → background → screen off → unlock → microphone revoked → killed by OS → notifications disabled → phone call interrupts audio → battery saver. Record observed behavior for each physical device/version.
- Volume sequence while app foreground, in background, locked and while music/calls playing. **Disable global/screen-off marketing claim if it fails.**
- Fake PIN: no alert animation; correct backend event; offline unavailable state; normal PIN never alerts; process death; brute force/rate limiting; security of stored PIN.
- Fake call: on-time, offline, dismissible, does not interfere with real phone and doesn't send SOS unintentionally.
- Evidence: permission denied; foreground stopped; upload expired; wrong MIME; 10s trim; encryption; recipient grant revoked. None delays SOS.

## Load, latency, battery and costs

Targets to measure, not claim achieved: local manual SOS response <1s, API transaction/enqueue p95 <3s, no duplicate worker jobs, responder location freshness within configured sampling budget when connected, background monitoring battery drain recorded for 60-min sessions, monthly SMS/OTP/map/provider budget simulated. Publish per-device test environment and percentiles, not best-case single timings.

## Four phase gates

- **Gate 1 — reliable core:** P0 auth, contacts, SOS, outbox, tracking, 112 and access controls pass; known SMS delivery limitations documented; no critical privacy leak.
- **Gate 2 — credible navigation:** OSM import, 3 route alternatives, temporal factors, low-coverage warnings, safe-shop moderation and journey server timers tested.
- **Gate 3 — verified enhancements:** fake PIN, fake call, real-device volume feasibility and ML evaluation documented; unvalidated features hidden or labelled experimental.
- **Gate 4 — integrated release/demo:** full dry-run, attack review, backup restore, monitoring alarms, usability test, written limitations, reproducible demo/video and reviewer approval.

## Artifacts required at each gate

CI logs, `test-results/` summary (no private data), measured latency samples, actual device/OS matrix, screenshots/video with synthetic contacts, unresolved issue list with severity and owner, reviewer decision, reproducible commands. A failed gate prevents claiming the following phase as fully accepted.
