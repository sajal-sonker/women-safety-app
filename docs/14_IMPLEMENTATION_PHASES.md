# 14 — Four-phase execution index

The detailed task authority is [EXECUTION_MASTER_PLAN.md](EXECUTION_MASTER_PLAN.md), baseline review-1.2. This index replaces the earlier broad outline so executors do not receive competing plans.

| Phase | Outcome | Task range | Gate |
|---|---|---|---|
|1 Foundation and reliableSOS | root/native setup, G0 contracts, auth/contacts, durableSOS, notification worker, location, recipient browser | P1-T01–P1-T15 | G0 then G1 |
|2 Intelligent navigation and safe journeys | versioned geodata/scoring, moderated reports/shops, ETA/check-in/escalation, mobile route comparison | P2-T01–P2-T12 | G2 |
|3 On-deviceAI and advanced safety | monitoring/nativeML, evaluated fusion, fakePIN/call, focused keys, private evidence/context and eligible responders | P3-T01–P3-T13 | G3 plus separate experiment graduation |
|4 Integration, reliability and final delivery | security/privacy, providers/devices/performance, deployment/restore, demo and independent delivery | P4-T01–P4-T10 | G4 |

Exact paths, ordering/dependencies, per-task owner/inputs/instructions/output/verification and per-phase failure/rollback/acceptance are in the master plan. [Ownership](AGENT_OWNERSHIP.md) controls branches/write boundaries; [integration contracts](INTEGRATION_CONTRACTS.md) plus05/04 control interfaces/schema; [testing gates](TESTING_AND_ACCEPTANCE_GATES.md) control evidence; [state template](EXECUTION_STATE_TEMPLATE.md) controls continuation.

Begin only P1-T01. T02 native spikes and T03 schema generation follow root scaffold; parallel feature work waits for G0-FROZEN. No routine human confirmation, but independent gate acceptance must actually be recorded. External blockers stop affected live validation, not unrelated fake-mode work. No coding has begun in the planning review.
