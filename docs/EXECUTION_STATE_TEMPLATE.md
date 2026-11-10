# Execution checkpoint and phase-report template

At P1-T01, B creates root EXECUTION_STATE.md from this template. This document is the format, not a claim that execution has begun. The canonical state has a single designated writer; executors submit lane entries/commits. IMPLEMENTATION_STATUS.md is an optional generated compatibility view with a link to canonical state, never a competing manually edited ledger.

## Root EXECUTION_STATE.md fields

Copy these sections and fill unavailable facts with UNKNOWN / NOT_RUN, never guessed values.

### Identity and integration baseline

- Project: SurakshaAI; plan baseline: review-1.2
- Updated at UTC:
- Current phase / gate / scope (local, controlled demo, pilot):
- State writer / active B or M executor / independent reviewer:
- Branch / worktree absolute path / HEAD commit:
- Pre-existing user changes preserved:
- Root/mobile/web/runtime/container versions and lockfile hash:
- Contract spec / generated artifact SHA256 / G0 reviewer record:
- Migration ledger head / DB environment:
- Model / score / geodata / consent / alert-template versions:
- Provider mode per auth/SMS/push/maps/storage: MOCK_ONLY / SANDBOX / REAL_VALIDATED / BLOCKED
- Capabilities/feature flags and experimental dispositions:

### Task ledger

| Task ID | Requirement IDs | Owner | State | Prerequisites | Start/end commit | Evidence | Next action |
|---|---|---|---|---|---|---|---|
| P1-T01 | foundation | B | NOT_STARTED | docs | UNKNOWN | NOT_RUN | inspect tools/Git and scaffold |

Populate all50 task IDs from master plan; no changing IDs after execution starts. States: NOT_STARTED, IN_PROGRESS, IMPLEMENTED_UNVERIFIED, DONE, FAILED, BLOCKED_EXTERNAL, DISABLED_EXPERIMENT. Record accepted fallback scope explicitly. DONE requires actual verification evidence, not just existing files.

### Last completed batch

- Completed task/requirement IDs:
- Produced files / modified files / deleted files (why):
- Commit(s), or uncommitted diff description:
- API/schema/fixture/native seam change and CR ID:
- Applied migration IDs/checksums; pending migrations:
- Test command, exit code, result counts, evidence mode, artifact path:
- Device model/OS/targetSDK/permissions/battery/network:
- Measurements and sample size:
- Security/privacy checks and failures:
- Decision(s) and rationale / source:

### Remaining work and known failures

| Task/test | Exact failure or missing resource | Severity | Owner | Reproduction | Safe fallback | Blocks |
|---|---|---|---|---|---|---|
| example | NOT_RUN | UNKNOWN | B/M/R | command pending | fake provider | named gate |

Distinguish code failure, unavailable dependency, skipped test and failed acceptance metric. An external blocker needs requested resource, decision owner and affected scope; credentials themselves never belong here.

### In-flight operations and recovery

- Running processes/tool sessions/ports (no secrets):
- Pending build/test log path:
- Partial file/artifact/checksum:
- Leased worker/jobs and lease-expiry policy:
- Unknown provider sends requiring reconciliation:
- Pending mobile intent / server event reconciliation method (synthetic IDs only):
- Backups / previous compatible artifact / rollback command reference:
- Last verified clean command and environment:

### Exact next executable instruction

- Task ID / assigned owner:
- Working directory and branch:
- Satisfied prerequisites and hashes:
- First command or bounded implementation action:
- Expected output / verification command:
- Remaining blocker for this action, if any:
- Next independent action if externally blocked:

Do not write “continue implementation” without a task/path/action.

### Gate decisions

| Gate | Functional result | Provider/device/data result | Independent reviewer / commit | Outstanding blockers | Authorized next scope |
|---|---|---|---|---|---|
| G0 | NOT_RUN | NOT_RUN | UNKNOWN | tool/schema work | P1-T01 only |

## Checkpoint protocol

1. Before work: read state, plan, ownership and contract lock; inspect actual Git status/diff and migrations; reconcile stale IN_PROGRESS tasks against artifacts and process logs.
2. Claim only owned, dependency-ready task. Record start commit and IN_PROGRESS.
3. After meaningful batch/test/migration/decision, checkpoint exact evidence. Use temporary write+atomic replace for state; no duplicate writers.
4. Before context/runtime interruption, preserve uncommitted work, pending sessions and next command. Do not reset, delete partial migrations, commit somebody else's secrets, or rerun real sends blindly.
5. Resume from next ready task after checking partial effects. Verify only missing/affected evidence and critical regressions; do not restart planning. Unknown send outcome requires reconciliation.
6. At gate, R compares evidence and records accepted scope. If R absent, keep review pending; do not claim independent approval. Single executor continues independent tasks that do not depend on that gate.
7. Failed critical/security test remains open until a recorded fix/rerun. Missing credentials/devices/data may block only affected work. No human confirmation between routine tasks.

## Standard phase-completion report

Use planned path docs/validation/phase-N.md, redact personal data.

| Field | Required content |
|---|---|
| Phase / scope |1–4, plan revision, local/demo/pilot |
| Source | branch, worktree, start/end commits, preserved user changes |
| Requirements/tasks | DONE / FAILED / BLOCKED / experiment disposition with IDs |
| Deliverables | actual file/artifact paths, APK/hash, provider mode |
| Contracts | hash, CRs, generated-consumer checks, native seam |
| Database | migration IDs, up/upgrade tests, rollback compatibility |
| Verification | exact commands/exit codes/counts/artifacts, failed/skipped explicitly |
| Physical devices | manufacturer/model/OS/SDK, permission/battery/network states, observed limits |
| Live integrations | sandbox vs real, permitted account, acceptance/receipt semantics; no secrets |
| Metrics | sample counts/percentiles/intervals, target vs measured |
| Privacy/security | authorization/consent/revocation/retention and audit results |
| Remaining issues | severity/owner/fallback/blocking gate |
| Recovery | previous compatible build/model/DB, tested recovery reference |
| Reviewer decision | R identity, evidence reviewed/reproduced, PASS_LOCAL/PARTIAL/FAIL or final scope |
| Continuation | next exact task/command, dependencies, external prerequisites |

The planning baseline currently has no implemented application tasks, G0 freeze or passed application tests. Preserve that distinction when initializing state.
