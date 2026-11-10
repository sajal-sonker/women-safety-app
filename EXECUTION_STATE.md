# SurakshaAI portable execution checkpoint

Updated10 November2026. Branch purpose: move the current project plus required agent instructions to another PC. Main is unchanged. Application baseline: `6237a1e1946af59cf208c2727070e54fb55945c0` (Phase1/2 controlled demo), after documentation baseline `eacb830`. Branch `handoff/agent-context` adds handoff context only; inspect actual HEAD for its latest commit.

## Authorized scope and reading order

The user authorized Phase1/2 implementation and push, then requested this separate portable branch. Lucknow synthetic fallback was explicitly approved. Phase3/4 are not implemented. This transfer is not an instruction to start another phase or claim independent acceptance. Read [PC_TRANSFER.md](PC_TRANSFER.md), [AGENTS.md](AGENTS.md), [executor prompt](docs/EXECUTOR_HANDOFF_PROMPT.md), [contract lock](packages/contracts/CONTRACT_LOCK.md) and [phase reports](docs/validation/phase-1.md).

## Existing implementation

- Root npm workspaces/lockfile, Express API, PostgreSQL/PostGIS migrations, worker/outbox/deadlines/retention and Next responder/contact/shop/admin web.
- Android RN/Kotlin Firebase auth, encrypted native SOS journal/transport, bounded foreground location and manual SOS/contacts/history/journey/route/shop/report UI.
- Contact invitation/consent and optional temporary GPS, scoped browser tracking/ACK/revocation, synthetic Lucknow routing/time factors, journeys, verified-status shop workflow and moderated coarse reports.
- No live SMS/push, ML/microphone monitoring, evidence capture, duress/fake PIN, fake call, global-key trigger or low-battery broadcast enabled.

Contract SHA256 `600ced35aec5aeb350c83bc0ef5a782f58b9bbd874befcf2a6356ba4bd4993db`:64 operations/72 schemas; generated TS/Kotlin and runtime validation. Sole migration stream `services/api/migrations/`,001–009 plus009a. Do not edit applied checksums or invent a second client contract.

## Recorded verification on the original PC

15 API/PostGIS/contract/scoring tests,2 mocked mobile component tests and2 Chromium/Auth-emulator end-to-end flows passed. Root/web/mobile type checks, lint, contract regeneration and documentation links passed. Next production build, arm64 debugAPK and Metro production bundle succeeded. Browser smoke at390px/1440px recorded no page errors/horizontal overflow. These are historical local results, not a new-PC pass or physical-device validation. Detailed boundaries: [Phase1](docs/validation/phase-1.md), [Phase2](docs/validation/phase-2.md), [provider register](docs/validation/provider-register.md).

At that inspection the full dependency tree had0high/critical and9low/19moderate audit findings; tooling compatibility warnings are recorded. Do not claim the audit is current without rerunning it. Remote GitHub workflow status is not certified by this checkpoint.

## Open gates and remaining work

G0/G1/G2 remain PARTIAL: independent review, actual native lifecycle/permission/battery/16KB/accessibility tests, broad failure/load/security matrix, real-provider setup and surveyed geographic evidence are missing. P1-T12 real-provider validation, P1-T15 independent gate, P2-T05 field validation and P2-T12 independent gate remain BLOCKED_EXTERNAL. Other Phase1/2 tasks are implemented within their documented evidence boundaries; outstanding owner reissue UI, deployment least-privilege/backup/privacy work is explicitly in the validation reports. P3/P4 tasks are NOT_STARTED.

## New-PC setup and recovery

No running sessions, service PIDs, local database or emulator users transfer with Git. Install Node26.13.0/npm11.20.0 and PostgreSQL17/PostGIS3.6; Android uses JDK17, SDK36/build-tools36.0.0, NDK27.1.12297006/CMake3.22.1 and the checked-in Gradle wrapper. Original tools lived outside the repository; do not assume those paths exist here.

Privately copy root `.env` or generate a fresh one if starting with empty data; never display its contents. Existing DB backups require the matching encryption key and a separate private restore. Normal demo setup needs only migrate/seed and Auth emulator accounts. No production Firebase credentials or release keys are configured. Android debug key is generated locally, not transferred. Ports: Postgres54329, Auth9099/UI4000, API4001, web3000, Metro8081. Inspect listeners before starting a second service. Browser Origin is `http://localhost:3000`.

Preserve existing applied migrations, intent tombstones, leases and encrypted records when restoring an existing DB. Restart workers rather than blindly replaying attempted sends. Root secrets and backups remain excluded. Main excludes agent files; this branch explicitly versions exactly seven required handoff files.

## Exact next executable task

Owner: one assigned executor. Working directory: cloned repository root on `handoff/agent-context`. First inspect Git status/tool versions, then follow PC_TRANSFER/RUNNING to install dependencies and configure local services. Run `npm run db:migrate`, `npm run seed:demo`, `npm run dev` after Auth/PostGIS are ready. Verify emulated owner sign-in, SOS/inbox/ACK/resolve, route comparison and journey controls; update this state with actual results and blockers. After that, follow the user's next authorized task and the master plan's gate rules. Do not restart Phase1, assume old process IDs work, self-certify review or start Phase3 solely from this transfer.
