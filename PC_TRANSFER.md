# Latest12 November2026 — friendly phone update

Current application main **642daa9e8a7b4fd3397e0f0fd784f41033c26bf6**. Read newest EXECUTION_STATE and main docs/validation/friendly-phone.md first. Local repeated-word SOS is separately opted-in (5words/30s,10s cancel); words themselves user-confirmed on Android16, new flow phone pass pending. New standalone APK hash cdb869a04b1672afd8bdb5343258f5678dbfc535b1507076cf8adb7e863d81e4. Do not run this context branch’s historical application or merge its exceptions to main.

# Latest12 November2026

Application main **1971e439d9a687ae8f9b1d2c58f9ec0903f713df** includes the phone-feedback corrections and new standalone APK. Use newest EXECUTION_STATE and main docs/validation/phone-feedback-fixes.md; older code/APK/status below is historical. Moto Android16 physical retest pending; no zero-bug claim. Deployment remains outside prototype.

# Application on main; portable context on this branch

Updated10 November2026. Current application commit: **e647b73b3589e892ff469cd2c56c5961d5def1dd** on main. This branch is for instructions/checkpoint documents and retains the historical Phase1/2 application snapshot. Do not run its old code as the latest application and do not merge its agent-file exceptions into main.

Clone main for the app, fetch handoff/agent-context for context, and read EXECUTION_STATE.md from that branch. If copying the seven context files into a main checkout, keep them ignored/local: AGENTS.md, EXECUTION_STATE.md, docs/AGENT_OWNERSHIP.md, docs/EXECUTOR_HANDOFF_PROMPT.md, docs/EXECUTION_STATE_TEMPLATE.md, docs/22_CODEX_REVIEWER_HANDOFF.md and apps/responder-web/AGENTS.md. Main's repository guard must still report no tracked context/credential files. Do not copy PC_TRANSFER.md onto main as an application artifact.

Follow RUNNING.md **on main**. npm ci, a privately transferred root .env or fresh ignored .env, PostgreSQL17/PostGIS3.6, migrate/seed, Auth emulator and dev processes recreate the demo. Tools, DB, APK, caches and process IDs are not carried by Git. Preserve matching encryption keys with old encrypted DB/backups; a fresh empty demo can generate fresh secrets. Never paste .env, OTPs, session cookies, backup contents or credentials into chat/issues/Git. Production signing/provider/storage credentials were never supplied.

Phase3/4 reports are on main: https://github.com/sajal-sonker/women-safety-app/blob/main/docs/validation/phase-3.md and https://github.com/sajal-sonker/women-safety-app/blob/main/docs/validation/phase-4.md . Read the current checkpoint for exact tests and remaining external blockers. Overall PARTIAL, no independent pilot acceptance. ML automatic dispatch/live providers/shop alerts remain disabled; no physical-device result exists.

ML/phone-test update: main now bundles a real licensed YAMNet confirmation-only sound model and native microphone service, plus tested training/export/event-evaluation tooling. It has no validated Hindi/English phrase recognition or automatic dispatch. User performs physical testing using docs/PHONE_TEST.md on main. See the newest EXECUTION_STATE checkpoint and main docs/validation/ml-continuation.md; do not treat older no-model statements as current.

Final dependency-ready update: read the newest EXECUTION_STATE section and main docs/validation/final-local-work.md. Old synthetic export/parity evidence is withdrawn and replaced by an explicitly frozen, finite-output, end-to-end tested workflow. Main docs/USER_CHECKLIST.md separates user phone testing now from real-data/provider/independent release gates. npm run doctor checks PC and USB readiness.

11 November2026 scope: working local demo only; production deployment and model graduation are deferred, not prototype blockers. Read the newest EXECUTION_STATE section and main docs/USER_CHECKLIST.md.

Latest11 November2026: Help/Bachao is implemented now with bundled pretrained offline English/Hindi models, not deferred. Follow newest EXECUTION_STATE and main docs/validation/help-bachao.md; physical phone testing is pending. Deployment remains outside the prototype.
