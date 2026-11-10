# Controlled-demo operations

This checkout is a local fake-provider deployment. It has no live sender, real map validation, graduated ML model, approved private object host/scanner, release key, public host or operator agreement. The provider register and phase reports own these open gates. Never enable a live provider by renaming a fake adapter.

Run API, worker and web as separate long-running processes. Database readiness is independent of SMS delivery. Inspect redacted request IDs, outbox queue age, UNKNOWN/DEAD jobs, scheduler lag and stale position labels. No logs may contain phones, GPS, grants, PINs or media. Stop leasing on shutdown; restart workers to recover expired leases. Do not blindly replay an attempted send. Existing transactions/tombstones and queue statuses remain authoritative.

## Backup and isolated restore

Set `PG_BIN` to the PostgreSQL17 `bin` directory if tools are not on PATH. `npm run backup:create` creates an AES-GCM encrypted local `.local/backups/*.dump.enc`, with a SHA256 of the custom-format dump. The demo uses the existing data-encryption key, which must be preserved privately; a production deployment requires a separate backup key and managed secret store. Keep `.env` and all archives out of Git. Backups expire after at most30 days; an operator must remove expired archives and verify provider copies. This local command is not a managed WAL/RPO15min service.

`ERASURE_LEDGER_PATH` must point to protected storage **outside any restored database volume**. The default `.local/erasure-ledger.enc` is for local rehearsal only; test databases use a separate file. Deletion writes the ledger after its DB commit and before returning202. The worker refreshes it after privacy processing. Copy the latest encrypted ledger to separately protected storage with the backups; restoring an older ledger loses newer erasure decisions. Do not start API/worker against an old restored DB before ledger merge/re-purge. A crash between DB commit and ledger write requires recovery from the latest DB/WAL before serving traffic.

`npm run restore:verify -- <encrypted-backup-path>` replaces **only `suraksha_restore_test`** on the same loopback server, verifies decryption/checksum, runs actual `pg_restore`, merges the latest ledger and reruns erasure. It never drops the application database. Missing ledger/key or failed reconciliation is a failure, not a skipped pass. This rehearsal establishes local recovery mechanics only; independent production backup expiry/RPO/RTO and rollback drills remain open.

## Performance and rollback

`npm run test:load` runs an isolated `suraksha_load_test` burst of500 creates at concurrency10, then100 owner polls. `npm run test:load -- --soak` runs100 initial active alerts plus10 creates/min for30min. Neither measures physical phones, real providers or full location/browser freshness; report those separately. Repeated runs retain synthetic load summaries in that isolated database. Inspect `.local/reports/load.json` and the declared profile before comparing p95 with3s. Never describe the short burst as the30min gate.

Use additive migrations010/011; do not change applied001–009a checksums or run destructive down-migrations. Roll back application/model artifacts together only after compatibility checks against these additive tables. Manual SOS, grants, tombstones and pending termination must survive. Automatic inference, global-key behavior and shop delivery remain off. A production rollout additionally requires TLS ingress, private DB/storage, least-privilege API/worker/migration roles, secret rotation, release signing, provider budgets and independent review.
