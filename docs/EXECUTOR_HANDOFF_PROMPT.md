# Resume SurakshaAI on another PC

This portable handoff supersedes the original planning-only kickoff. **Phase1/2 controlled-demo code already exists** at application baseline `6237a1e1946af59cf208c2727070e54fb55945c0`. Do not start at P1-T01 or overwrite existing scaffolding. This transfer does not implement Phase3/4 or self-approve pending gates.

## Copy-ready executor instruction

> Read AGENTS.md, EXECUTION_STATE.md, PC_TRANSFER.md and README.md. Inspect the actual branch, Git status, tool availability and running services first. Read the complete relevant specs in docs, with EXECUTION_MASTER_PLAN.md as task authority, INTEGRATION_CONTRACTS.md/05_API_CONTRACTS.md and packages/contracts/CONTRACT_LOCK.md as shared-contract authority,04_DATA_MODEL.md for SQL ownership and TESTING_AND_ACCEPTANCE_GATES.md for evidence. Preserve user changes and the application already implemented; do not initialize a replacement repo, reset/clean, or restart Phase1.
>
> On a new PC, install the pinned runtime/toolchain from RUNNING.md and run npm ci. Use a privately transferred root.env or generate a fresh one with scripts/init-env.mjs only if absent. Never print or commit secrets. Recreate a local PostGIS database, Auth emulator and synthetic seed; do not assume the old PC's DB, service ports, process IDs, tools or emulator users are present. Run migrations, seed and start the existing app. After requesting phone verification, use the emulator verificationCodes endpoint for the test OTP, not an actual SMS.
>
> Smoke-test existing sign-in, SOS→fake contact inbox→private tracking→ACK→resolve/revoke, route comparison and journey arrival/escalation. Previous-machine tests are recorded evidence, not a pass on the new machine. Inspect failures before extending features. Native auth/location/journal/MapLibre compiled on arm64, but no physical-device lifecycle pass was obtained. Record device/OS/permission state, exact commands and results. Independent G0/G1/G2 acceptance remains PARTIAL.
>
> Follow the next explicit user task. Phase3 is the next product phase, not yet implemented; before expanding it, review the partial gate report and resolve affected prerequisites or obtain the defined scope decision. Do not silently treat external/device/provider/reviewer gaps as passed. Keep Phase4 hardening/final acceptance distinct. Do not launch sub-agents without explicit authorization. One executor may perform B then M sequentially under docs/AGENT_OWNERSHIP.md.
>
> Preserve emergency invariants: initial manual SOS never waits for fresh GPS, router, media or ML. Native encrypted journal and server intent locks/tombstones own retry/termination. Notify only registered verified trusted contacts. Separate optional contact GPS consent from recipient consent. Keep queued/provider-accepted/delivered/human ACK distinct, and never claim guaranteed safety/delivery or police dispatch. Monitoring is opt-in only, Phase3 capabilities remain off until evaluated, and low-battery broadcasts remain excluded. Do not use AccessibilityService for global keys.
>
> Keep fake SMS/push and local auth emulator defaults. Live emergency push/FCM is blocked under the published guidance; real providers, budgets, devices, hosting, agreements and geographic source validation need their own evidence. Lucknow fixtures are fictional, approved only for the demo. No live sender, street survey or police integration exists.
>
> Backend owner controls contracts, root lockfile, migrations and server/web/worker; mobile owner controls RN/Kotlin/ML. Change canonical OpenAPI before regenerating TS/Kotlin, update every consumer and affected test, record the hash/CR, and obtain independent review as required. Never edit applied migration checksums. Do not invent parallel contracts. B/M executor cannot self-certify independent review.
>
> Work continuously on authorized dependency-ready tasks and routine fixes without repeated confirmation. At meaningful checkpoints record files, task IDs, commands/exit codes, mock vs real/device evidence, failures, decisions, blockers and next executable task in EXECUTION_STATE.md. Credentials, personal data and temporary OTP/session material never belong there. Stop only affected operations needing unavailable resources, credentials/spending or an unresolved product/security decision. Before interruption preserve changes and reconcile unknown sends; do not replay real sends blindly.

## Initial bounded task on the new PC

1. Confirm checkout is `handoff/agent-context` or its intentionally created development branch; read current state and contract hash.
2. Complete local setup from [PC_TRANSFER.md](../PC_TRANSFER.md) and [RUNNING.md](../RUNNING.md), keeping `.env` ignored.
3. Execute missing/affected smoke checks and record fresh results. Tests requiring physical devices or real providers remain explicitly NOT_RUN/BLOCKED if unavailable.
4. Report readiness and the next dependency-ready task from the user's authorized scope. No repeat architecture planning, new feature phase or push to main is implied by transferring the project.
