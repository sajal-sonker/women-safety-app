# Agent ownership and integration protocol

The original review authorized planning only; the user subsequently authorized Phase1/2 implementation and GitHub push. Those controlled-demo implementations now exist. This portable branch transfers their context; it does not launch additional work. Future execution uses one reviewer (R), one mobile executor (M), and one backend/web executor (B), or one executor working B/M sequentially. No autonomous nested agents. A separately assigned ML specialist may replace M for a named task; there is never concurrent ownership of `ml/`.

## File ownership

Ownership below remains binding. Phase1/2 code paths now exist; later-phase paths remain planned. Actual evidence and unaccepted gates are recorded in EXECUTION_STATE and docs/validation.

| Owner | Exclusive write area | Responsibility |
|---|---|---|
| R | Review/decision/plan documents; `IMPLEMENTATION_STATUS.md`, integrated `EXECUTION_STATE.md` | Accept contracts/gates, inspect diffs, run acceptance/security checks; no production code. Executors provide state entries; R integrates them. A single executor may maintain state when R is absent. |
| B | Root package/workspace/lockfile/config, `.github/`, `infra/`, `services/api/`, `services/worker/`, `packages/contracts/`, `packages/shared/`, `apps/responder-web/` | Database, migrations, auth, routes, jobs, providers, geospatial, evidence, responder/contact/shop/admin web, OpenAPI/generated clients/fixtures. |
| M | `apps/mobile/`, `ml/` | React Native, Kotlin, all mobile screens, auth/native interfaces, sensors, ML research/evaluation, local journal, permissions, localization/accessibility/device tests. |

Database migrations have **one** location: `services/api/migrations/`. B alone numbers/applies them. `infra/` deploys them but contains no competing migration stream. API domain modules own business rules; worker imports them without importing Express routing; Next.js cannot write DB tables directly. B owns web routes `/track`, `/contacts/invite`, `/contact-location`, `/shops`, `/admin` and every REST endpoint. M owns every screen in [UI inventory](12_UI_UX.md).

## Sequential work before parallel implementation

1. B performs P1-T01 root scaffold and toolchain lock. M supplies its mobile dependency list; B alone edits workspace lockfile. No executors are launched by this review.
2. M performs P1-T02 Android/native compile and platform spikes. B can prepare P1-T03 schemas after root scaffold; neither invents independent types.
3. B generates complete v1 schemas, API catalogue, fixtures and client from [contracts](INTEGRATION_CONTRACTS.md) and [API definitions](05_API_CONTRACTS.md). M verifies null/error/native consumers. R records **G0-FROZEN** with contract hash, versions, consent policies and ownership. Both P1-T02 and P1-T03 must pass before parallel feature work.
4. B may then run P1-T04 through T09/T12, while M runs P1-T10/T11/T13 using generated mocks. Live integration occurs at P1-T14, gate at T15. Subsequent phase task dependencies are authoritative; no branch may consume unaccepted shared changes.

## Shared interfaces

| Seam | Author / consumer / reviewer | Freeze/change rule |
|---|---|---|
| OpenAPI, error/enums/auth, fixtures, alert/events, adapter interfaces | B / M + web + worker / R | B commits schemas plus generated artifacts and all affected tests together. No locally copied interfaces. |
| Kotlin auth/location/monitoring/trigger handoff | M / mobile UI and native service / R | M documents native interface under `apps/mobile/docs/`; no undocumented JS-only trigger requirement. Network payload stays B-owned. |
| Provider callbacks and receipt mapping | B / delivery reducer + UI / R | Fake and real adapters share the same conformance tests; unsupported receipt capability remains explicit. |
| Route feature/score/model manifests | B routing, M ML / mobile + web / R | Separate score/model versions. Model tensor schema, checksum and calibration accompany each model. |
| DB/time/consent/retention | B / all / R | SQL constraints and API negative tests accompany every changed invariant. No executor silently changes retention or consent. |

## Branches, merge and failed builds

Use `phase-N/backend`, `phase-N/mobile`, and a reviewer integration branch; separate worktrees share only committed contract commits. A `.git` repository exists at review time, with a modified tracked README and pre-existing untracked specification files. Preserve these user changes. P1-T01 records the existing branch/status and establishes a reviewed documentation baseline before creating worktrees; do not initialize a replacement repository. No remote, commit, push or merge is claimed by this planning review.

Integrate contract commit first, then B migrations/API, then M consumers, then acceptance fixtures. B serializes dependency/lockfile edits requested by M; never hand-merge generated lockfiles. Preserve user changes and other owners' work. Schema conflict returns to B/R; screen conflict to M; no broad reset/rebase of another owner's branch. Use additive migrations until rollout verified, then scheduled cleanup.

An executor fixes failures in its own area before handoff. A shared test failure is assigned by R to the boundary owner using the failing contract fixture; the other owner supplies a minimal reproduction. Do not work around a broken contract in UI. Flaky critical tests remain failures until cause resolved. Each batch reports requirement IDs, tasks, changed paths, migration IDs, exact commands/exit codes, fake/live evidence, risks and next task. R compares evidence with [gates](TESTING_AND_ACCEPTANCE_GATES.md) and issues one bounded correction batch, not recurring open-ended prompts.

## Continuous execution and unavailable integrations

No human confirmation between routine numbered tasks. Complete the next dependency-ready task in the assigned area, checkpoint, and continue within runtime limits. At a gate stop expansion until reviewer evidence is recorded. An unavailable physical device/provider is `BLOCKED_EXTERNAL`, not a passed test. Continue isolated work that cannot invalidate a failed gate; do not label the next phase accepted. A single executor may do B then M sequentially with the same boundaries; it still cannot self-certify independent review.
