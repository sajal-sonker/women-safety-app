# Phase 3 — advanced controlled-demo implementation

**CR-004 continuation:** the model/runtime block below is historical. A real licensed pretrained YAMNet model, native microphone foreground service, audio/motion confirmation reducer, model-integrity checks, dataset/training/export and event-level evaluation tools are now implemented. See [ML continuation evidence](ml-continuation.md) and [phone test](../PHONE_TEST.md). Automatic dispatch and Hindi/English phrase validation remain blocked; a generic audio-event baseline does not satisfy phrase recognition or independent G3 acceptance.

Date:10 November2026. Baseline:6237a1e plus CR-003. **Overall PARTIAL; independent G3 NOT_ACCEPTED.** User authorized continuing Phases3/4 within the existing fake-provider application. No previous partial gate is upgraded by executor assertion.

| Task / requirement | Result / evidence boundary |
|---|---|
| P3-T01 monitoring | Native bounded motion-only foreground session; explicit consent, monotonic expiry, stop on activity pause/account change. No microphone inference service enabled; complete mic lifecycle remains blocked by model/device evidence |
| P3-T02 FAKE-01 | Native immediate simulation, configurable label, inexact AlarmManager reminder, notification permission check, dismiss/cancel, transient audio focus; no Telecom/full-screen/exact-alarm entitlement or implicit SOS. Physical real-call/lock/reboot cases NOT_RUN |
| P3-T03 PIN-01 | Distinct account-bound normal/duress scrypt verifiers (N32768/r8/p1, separate32byte salts), Keystore-encrypted store, constant-time comparison, persisted attempt backoff, recent-auth setup/reset, rehearsal, Notes decoy and existing one-intent native transport. Component decoy test; physical coercion/KDF/clock matrix NOT_RUN |
| P3-T04 KEY/MOT | Default-off controlled-demo focused up/down/up/down sequence, normal volume handling retained, cooldown. Motion asks for check-in only. Background/power interception unsupported; physical focused-key matrix NOT_RUN |
| P3-T05/06/07/09 ML | **BLOCKED_EXTERNAL / DISABLED**. No consented private dataset, trained LiteRT artifact or two-phone measurements supplied. Dataset integrity/support checker and statistical-bound tests exist; no fake model or accuracy result. [Model card](../../ml/MODEL_CARD.md) |
| P3-T08 SOS-05/06 | Additive010; timestamp-ordered independent context; single-upload encrypted local fake storage, WAV/image structural validation, image re-encoding/metadata removal, async processing, per-asset recipient scopes, bounded authenticated streams/audit, consent/resolve/delete revocation. Real private object host, malware scanner, MP4 and geocoder adapters remain unavailable |
| P3-T10 evidence capture | Explicit selected contacts after accepted SOS; foreground ≤10sec16kHz mono PCM audio and delegated camera-preview photo, in-memory bytes, no ambient-buffer upload, no automatic retry. Stops audio on pause/withdrawal/call-mode conflict. Full-quality/video/device lifecycle NOT_RUN |
| P3-T11 CONT-02/ETA/SHOP-03 | Existing fresh consented trusted-contact ranking retained; new transient, separately consented responder origin gives labelled straight-line walking estimate, never persisted. Shop alert routes fail FEATURE_DISABLED without agreements; no fabricated dispatch |
| P3-T12 integration | Real PostGIS authorization/quarantine/withdrawal/context tests; mobile decoy/simulation component checks; browser evidence and export flow. Native/device evidence remains distinct |
| P3-T13 review | Independent reviewer absent; **BLOCKED_EXTERNAL**, no self-certification |

Completed paths: `apps/mobile/src/{AdvancedControls,EvidenceControls}.tsx`, native `triggers/`, `monitoring/`, `evidence/`, `services/api/src/modules/evidence/`, responder controls/tracking, generated shared contracts. Black/purple theme preserves layout, labelled states and emergency affordances.

Contract changes: [CR-003](../../packages/contracts/CONTRACT_LOCK.md),80 canonical operations including3 binary handlers;85 named schemas. Initial SOS has no media/geocode/model dependency. Local adapter uses an owner-authenticated relative upload URL and checksum header, not a public storage capability. Only local sanitized WAV/JPEG/PNG can become AVAILABLE; local format validation is not a real malware-scanner certification.

Tests: `npm test`22 passing at initial advanced checkpoint; `npm run test:mobile`4 passing; `npm run typecheck`, `npm run lint` pass. Later fault/security/build/browser results are recorded in [Phase4](phase-4.md). First mobile test run timed out during parallel initial compilation; rerun passed after setup, with a30s harness timeout. First native compile used stale generated interfaces during edits; settled-input rebuild is tracked in Phase4, never silently counted as a pass.

Real-device results: none; `adb devices` returned no attached devices. No physical OS/permission/energy/accessibility/coercion observations. Experimental dispositions: audio AI/automatic sensor SOS DISABLED/BLOCKED_EXTERNAL; focused keys/motion LIMITED_UNVERIFIED controlled demo only; global keys/power unsupported. Committed PIN/fake call require device acceptance rather than being relabelled as experiments.

Security/privacy checks: owner/recipient scope, anonymous/moderator denial, hash/MIME/size/structural checks, quarantine unreadability, timestamp order, immediate consent/terminal denial, encrypted private bytes, metadata removal, no raw media/PIN/grant logs. Native memory/Keystore/accessibility review and external storage assessment remain open.

Known blockers: datasets/rights/model/runtime, two physical phones, operational shop agreement, real geocoder/storage/scanner/provider resources, full native instrumented matrix, independent G0–G3 review. Next phase prerequisites: **not fully satisfied**; user-authorized Phase4 controlled-demo tooling is implemented, not an accepted phase transition or pilot release.
