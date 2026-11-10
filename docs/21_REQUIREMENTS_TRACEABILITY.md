# 21 — Requirements traceability and source-of-change matrix

This matrix prevents a common documentation failure: silently treating the professor's narrower comments as the source of the team's own innovations.

| Source | Point | Requirement IDs | Ownership / note |
|---|---|---|---|
| Uploaded team outline | SOS button; shake/power trigger | SOS-01, KEY-01, MOT-01 | power trigger requires separate feasibility check; don't hijack 112 system gesture |
| Uploaded team outline | Fake incoming call | FAKE-01 | in-app simulation |
| Uploaded team outline | Safe journey with ETA and overdue contact alert | JOUR-01, JOUR-02 | server-owned timer |
| Uploaded team outline | Scream/distress-word + motion/phone snatch detection | ML-01, ML-02 | situational, on-device and experimentally validated |
| Uploaded team outline | Safe shop/tea stall/pharmacy network | SHOP-01/02/03 | verified participant/consent required |
| Earlier team discussion | Live-location, 3–5 contacts, history, phone OTP | AUTH-01, CONT-01, SOS-03/04 | core app |
| Earlier team discussion | Context-rich alert photo/audio/battery/motion/landmark | SOS-05/06 | optional async evidence, no delay |
| Earlier team discussion | Nearest **preconfigured** emergency contact | CONT-02, SOS-07 | contact consent and freshness required |
| Earlier team discussion | Activate monitoring only when unsafe, avoid 24/7 | ML-01, ML-02, MOT-01 | battery/privacy/Android constraints |
| Faculty feedback reported earlier | Time-aware route scoring and standing out | ROUTE-01/02/03 | professor requested time-aware scoring; specific factors from team |
| Earlier team discussion | Poor lighting, isolation, incidents, open shops, police, time of day | ROUTE-01/02 | team-designed indicators, confidence required |
| Latest **actual faculty message** | Add Fake PIN mode | PIN-01 | included in Phase 3 |
| Latest **actual faculty message** | Low-battery auto-location broadcast proposed, but optional | OFF-01 | **explicitly excluded** by team |
| Latest **actual faculty message** | References a silent volume-key emergency code | KEY-01 | concept already in team plan; experimental due Android restrictions |

## Traceability checkpoints

- Every PRD ID has a primary task/gate in [EXECUTION_MASTER_PLAN.md](EXECUTION_MASTER_PLAN.md), with earlier foundations and later regression tasks where required; explicit exclusions remain out-of-scope.
- Every external data input has source/provenance/unknown behavior in `16_DATA_SOURCES.md`.
- Every privileged capability (contact location, media, shop alert, monitoring) has a consent flow and a negative authorization test.
- A feature is not presented as delivered until its test ID/results are included in Gate report.
