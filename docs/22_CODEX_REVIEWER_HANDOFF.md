# 22 — Reviewer and executor handoff index

The original planning review is documented in [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md). Subsequently, the user authorized and received Phase1/2 controlled-demo implementation at baseline6237a1e. No executor agents were launched. Read [current execution state](../EXECUTION_STATE.md), [Phase1 evidence](validation/phase-1.md) and [Phase2 evidence](validation/phase-2.md); independent acceptance remains partial.

The canonical copy-ready executor instruction is [EXECUTOR_HANDOFF_PROMPT.md](EXECUTOR_HANDOFF_PROMPT.md). It replaces the earlier broad mobile/backend prompts and repeated-planning kickoff.

For an independent reviewer of future implementation:

> Read README.md, AGENTS.md and the complete reviewed specifications. Stay in reviewer scope: inspect actual diffs, reproduce acceptance/security checks, evaluate claimed provider/device/model results and record G0/G1–G4 decisions. Do not write application code or launch agents. Follow the task/contract/gate ownership in EXECUTION_MASTER_PLAN, INTEGRATION_CONTRACTS and AGENT_OWNERSHIP. Use the phase-report template, return bounded fixes to the responsible executor and distinguish local/mock acceptance from pilot approval. Never certify omitted tests or unavailable resources. Preserve user-confirmed scope, exclusions, consent and emergency delivery semantics.

Routine executor work continues through dependency-ready tasks and checkpoints; the reviewer is needed at contract/phase gates, not to issue a new prompt for every task. A missing reviewer leaves independent approval pending rather than self-certified.
