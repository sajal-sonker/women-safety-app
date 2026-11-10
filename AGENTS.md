# AGENTS.md — execution instructions for coding agents

## Portable handoff status — 10 November 2026

This branch carries the application plus agent context for another PC. Read `PC_TRANSFER.md`, `EXECUTION_STATE.md`, `docs/EXECUTOR_HANDOFF_PROMPT.md` and the phase validation reports first. Current application lives on main at `4944d30`, including controlled-demo Phase3/4 additions; all independent/device/provider/model/operations gates remain PARTIAL. This context branch retains the historical `6237a1e` application snapshot. Use main for code and current phase reports; never merge these seven agent-file exceptions into main. The earlier planning-only restriction applies to the independent reviewer role, not an executor subsequently authorized by the user. Do not restart scaffolding or claim the existing partial gates passed. One executor may work B/M sequentially; no automatic sub-agent delegation.

On this handoff branch the seven explicitly listed agent files are intentionally versioned at the user's request. Keep credentials, `.env`, private keys, caches, build outputs and other local agent configuration excluded. Main's policy remains unchanged. Do not merge the handoff exceptions into main unless the user changes that policy.

This is the project's **non-negotiable working contract**. `README.md` gives reading order; requirements are in `docs/02_PRD.md`. Agents must not silently change architectural or safety decisions.

## Team operating model

- One **planner/reviewer agent** reads the documents, checks work and issues bounded prompts; **it does not implement production code**.
- Separate **mobile executor** (React Native + Android Kotlin) and **backend/web executor** (Node.js + Postgres + Next.js) may work in parallel **only after** endpoint/schema contracts and ownership are accepted.
- A routing/ML specialist may take specific isolated tasks, but avoid autonomous nested agents unless the team explicitly changes this rule.
- Use **four execution phases** in [docs/EXECUTION_MASTER_PLAN.md](docs/EXECUTION_MASTER_PLAN.md). Root `EXECUTION_STATE.md` is the canonical task/gate/recovery ledger, created from the state template at P1-T01; `IMPLEMENTATION_STATUS.md` is only a generated compatibility summary. One designated state writer records blockers, commands, tests, commits and decisions.
- Prefer a mono-repo: `apps/mobile`, `apps/responder-web`, `apps/admin-web` (can be part of responder web with RBAC), `services/api`, `packages/contracts`, `packages/shared`, `ml/`, `infra/`, `docs/`.

## Before any coding

1. Read `README.md`, `docs/02_PRD.md`, `docs/03_ARCHITECTURE.md`, `docs/05_API_CONTRACTS.md`, `docs/11_SECURITY_PRIVACY.md`, and the phase plan.
2. Record approved defaults/open issues in the repo decision log; do not pretend unspecified provider credentials or agreements exist.
3. Lock: IDs, enum states, auth tokens, endpoint paths, event sequence, schema ownership, maps provider interface, error model, and development fixtures.
4. Resolve or spike high-risk platform behavior (global hardware keys, background mic, fake PIN alerts, location permission, Android SMS policy) **before** promising it to demo reviewers.
5. Define a fake-provider/test mode. No real emergency messages, calls, live recordings or incident exposure in automated tests.

## Change discipline

- No user-facing claim of guaranteed safety, guaranteed delivery, automatic law-enforcement dispatch, certified safe shops, or reliable screen-off global volume-key interception without evidence.
- Never build hidden persistent surveillance, silently share a contact's location, leak evidence, or use AccessibilityService as a shortcut to intercept global keys without independent policy/security review.
- Never postpone initial SOS delivery to wait for media upload, landmark lookup, route computation or model inference.
- One owner per migration, endpoint, interface and screen. If contract changes, update the corresponding MD and all consuming tests in the same integration batch.
- If a conflict exists, precedence: explicit new user decision > PRD acceptance criteria > reviewed integration/wire/data contracts > design details. Review-1.2 corrections documented in ARCHITECTURE_REVIEW are engineering defaults, not a change to user requirements. EXECUTION_MASTER_PLAN supersedes the legacy phase outline; TESTING_AND_ACCEPTANCE_GATES owns thresholds; INTEGRATION_CONTRACTS and05/04 own interfaces/persistence. Raise a genuinely unresolved conflict to reviewer rather than inventing a contract.

## Phase completion report format

```
Phase: [1-4]
Completed: [items with paths]
Contract changes: [none / exact diff]
Tests: [command, passed, failed, skipped]
Real-device results: [OS, device, permission state, observed behavior]
Security/privacy review: [checks completed]
Known limitations/blockers: [specific]
Next phase prerequisites: [satisfied / missing]
```

## Parallel work coordination

**Backend/web owner:** schema/migrations, auth verifier, SOS durable transaction + outbox, delivery provider adapters, signed tracking session, responder portal, shop/report moderation, routing service interface.

**Mobile owner:** navigation, onboarding, sensor/foreground-service integration, SOS UX, journaling, mapping, safe journey UI, fake call/PIN, media consent, mobile contract tests.

**Joint agreed seams:** shared types, mocks, `X-Request-ID`, idempotency, location formats, auth, alert type and state enums, notifications, decision on volume-key feasibility.
**Reviewer:** run integration acceptance and security checklist; reject unchecked claims and untested conditions.

## Stop-the-line failures

- SOS delayed by enrichment; credentials embedded in apps; public raw location or evidence link; arbitrary contact tracking; leaked media; undetected privilege escalation; incorrect success screen for unconfirmed delivery; background sensor capture without ongoing consent; false assurance that 112 automatically received SOS.

## Definition of done for a feature

Spec ID linked, error/edge cases handled, unit + integration tests, security/privacy test, accessibility and device checks if relevant, documentation updated, observability event present, demo fixture reproducible, no credentials or real personal data in repository.
