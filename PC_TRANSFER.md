# Move the project to another PC

This branch includes the complete Phase1/2 application, specifications and seven required agent handoff files. Main is unchanged. Read [EXECUTION_STATE.md](EXECUTION_STATE.md) and [executor prompt](docs/EXECUTOR_HANDOFF_PROMPT.md) before continuing; do not rebuild Phase1 from scratch.

## Clone this branch

```sh
git clone --branch handoff/agent-context https://github.com/sajal-sonker/women-safety-app.git
cd women-safety-app
```

GitHub credentials, if requested for access, are configured separately on the new PC. The old PC's Git credentials, Codex account/session files and editor caches are not part of this transfer.

## Which secrets to send privately

The **only required existing secret file for this local-demo setup** is the repository-root **`.env`**, currently `E:\Women Safety\.env` on the old PC. Copy it privately to the cloned repository root on the new PC, using a trusted USB drive or encrypted transfer. Do not commit it, paste its contents into chat, or put it in an issue. It contains the DB connection/password, data-encryption key and receipt-signature secret. `.env.example` is already in Git and contains placeholders only.

The current `.env` points at the old PC's local Postgres configuration. Install/configure a database on the new PC and update only the new copy's `DATABASE_URL` as needed. The current file has no `POSTGRES_PASSWORD` variable: if using the Compose database, append that variable privately, then ensure its value agrees with the password in `DATABASE_URL` before starting Compose. Do not change the old PC's environment or database to set up the new PC.

Alternatively, to start a completely fresh local demo, **no secret transfer is required**: run `node scripts/init-env.mjs` to generate a new ignored `.env`, then migrate and seed an empty database. It refuses to overwrite an existing `.env`.

Do **not** transfer `apps/mobile/android/app/debug.keystore` for this setup; the current Gradle project uses the standard locally generated debug signing key. There are no production Firebase service-account/Google services files or release-signing keys configured in this checkout. Do not confuse debug signing with a production release key.

## Database and local tools

Git does not carry the running Postgres database, emulator accounts, installed Android SDK/JDK/Node, APKs or `node_modules`. For a demo, recreate them using [RUNNING.md](RUNNING.md): install the pinned tools, `npm ci`, create local PostGIS, start Auth emulator, `npm run db:migrate`, `npm run seed:demo`, then `npm run dev`. On PowerShell use `npm.cmd` if npm.ps1 is blocked. Do not run the environment initializer after copying `.env`.

If existing alert/history data must be preserved, a separate **private PostgreSQL backup/restore** is needed along with the matching `.env` data key. The backup may contain private locations and token material; never push it to Git. Fresh seeded data is enough to resume the current demo. Auth emulator OTPs/session cookies are temporary and are recreated after startup.

## Resume work

Use the emulator verification-code endpoint after requesting a code: `http://127.0.0.1:9099/emulator/v1/projects/demo-surakshaai/verificationCodes`. The `/auth` UI primarily lists accounts. Log in with seeded owner `+16505550101`, then check SOS, responder ACK/revocation, routes and journeys. Android native lifecycle/device verification remains pending. Do not claim tests passed on the new PC until executed there.

Copy-ready instruction for the next agent:

> Read AGENTS.md, EXECUTION_STATE.md, PC_TRANSFER.md and docs/EXECUTOR_HANDOFF_PROMPT.md. Inspect the actual checkout and tool availability, configure local demo services without exposing secrets, and smoke-test the existing Phase1/2 application. Preserve its contracts and recorded partial gates. Resume the next user-authorized task without restarting the project or claiming previous-machine tests as new results.

This branch intentionally includes handoff files and a matching explicit CI allowlist. Keep it separate from main unless the user requests a policy change. Credentials and build output remain excluded on both branches.
