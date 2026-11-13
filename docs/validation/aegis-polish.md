# Aegis polish and hosting preparation —13 November2026

Scope authorized by the user: fix recipient response resurfacing, automatic word SOS, PIN/connection/permission errors, focused volume shortcut and confusing assistance points; rename the app Aegis; prepare fully hosted mobile-data access; push application changes to GitHub. Baseline main d87f828. Local secrets, agent instructions/state and installed tools stay excluded.

## Changes and reasons

| Area | Root issue | Result |
|---|---|---|
| Android recipient | ACK controls remained visible, polling erased confirmation, summary omitted own response | CR-010 adds summary own_acknowledgement; successful ACK closes panel, saves an on-way/cannot-help message, suppresses new-response banner and offers explicit Change my response on reopen. Late pending snapshot cannot undo accepted state. Failed POST never shows success |
| Browser recipient | Same assist actions kept resurfacing after response | Successful response hides buttons, shows saved status, permits explicit change; revoked session still clears private data |
| Repeated-word SOS | Countdown called ML_FUSION, but native entry allowed only manual/PIN/volume | Dedicated UID/session-authorized voice entry permits the already-approved five-word,10s-cancel opt-in path; checks active unexpired running session/claim and server monitoring consent. Generic bridge ML_FUSION remains rejected. Bare sound/motion still only prompts |
| PINs | Generic rejection hid invalid length/equality and fresh-auth requirement | Frontend/native6..12digit checks, distinct codes, categorized errors, inline same-account OTP reauthentication. No sign-out required; Practice defaults on; existing KDF/backoff unchanged |
| Volume keys | Local switch disagreed with native state; modal key events and system volume overlay interfered | Native state drives UI; focused four-tap sequence within5s,5s cooldown, held-repeat rejection, consumed volume events, modal key-up forwarding, pause reset. No background/global/lock-screen interception |
| Permissions | Several failures were rendered as generic permission/connection issues | Typed native failures and UI error mapping; explicit notification permission check and check-in category Settings action for voice opt-in |
| Help discovery | Fictional map-centre distances looked like nearby real shops | User-invoked real Maps searches for police/hospital/pharmacy; separately collapsed fictional Lucknow examples. No automatic GPS capture, sample phone calls or guaranteed-safety claim |
| Branding | SurakshaAI public label | Aegis/Aegis Demo/Aegis Pilot, adaptive shield icon, web header/metadata and service notification titles; internal React/package/database/key identifiers preserved |
| Hosting | Loopback/emulated auth required a PC and USB | Separate HTTPS-only build-pinned Pilot, signed real Firebase auth config, non-loopback hosted server mode, supervised API+worker/container files, durable ledger requirements, hosted build helper and secret-free env example. Hosted browser no longer calls local-only dev inbox |

Contract SHA256 **56c07ea3fe5250f7c50a85ea41fc5b07f493c0798f1a6cbd8324f692d5523a5c**;85 operations/90 schemas. No SQL migrations changed. See [lock](../../packages/contracts/CONTRACT_LOCK.md), [native/wire semantics](../INTEGRATION_CONTRACTS.md) and [deployment steps](../HOSTED_PILOT.md).

## Executed verification

- `npm run typecheck`, `npm run lint`: pass for API/contracts/web/mobile.
- `npm test`:39 passed using an isolated local PostGIS test database. Includes confirmed recipient summary response, authorization/revocation, repeated-word trigger idempotency, missed-arrival escalation, delivery uncertainty, privacy/evidence and hosted configuration refusal checks.
- `npm run test:mobile`:39 passed. Includes saved ACK dismissal/reopen/change, pending-snapshot resistance, account-switch/revocation behavior, invalid/equal PINs, recent-auth inline verification, native volume state, explicit Maps action and fictional catalogue boundary.
- `:app:testDebugUnitTest`:40 passed,0 failures/errors. Includes trigger policy, repeated-word counter, motion/phrase reducers, focused-key window/repeat/cooldown, PIN policy, endpoint policy and error categorization. Pure policy tests are not physical microphone/SOS evidence.
- `:app:assembleDemo -PapiBaseUrl=http://127.0.0.1:4001 -PreactNativeArchitectures=arm64-v8a`: successful standalone Android build. Gradle/AGP deprecation warnings remain; no forced dependency upgrades.
- `npm run build -w @surakshaai/web`: production build passes, including standalone output.
- `npm run test:web`:6 passed in42.2s using local Firebase Auth/API/worker/web. Includes real browser assist→saved controls hidden across polling→explicit change→owner resolve/revocation; route/journey/evidence/export/offline/no-overlap/old-account regressions. First attempt failed because services had stopped; after restart, the empty-inbox precheck exposed an auto-wait timeout. Test now checks optional link count before reading and activates the relevant browser tab/uses DOMContentLoaded. Final complete suite passes.

APK static verification checks standalone JS, YAMNet hash,28 speech asset hashes, licences, exclusion of private/generated recordings and18 native ELF16KB load alignment. APK v2 signature and ZIP16KB alignment pass. Public label Aegis Demo; package com.surakshaai.demo. This does not certify16KB runtime compatibility or distress accuracy. Final APK hash is recorded in the local execution checkpoint after the last native build; APKs are ignored and CI publishes its own artifacts.

Final local arm64 APK:163080507bytes, SHA256 **7a04c0a5c23e0e47cfc9edfca2e3edae2ec0cc85f3a50c4a9f609ea57e3f57e1**. Static verification used an equivalent local PowerShell ZIP/hash/ELF check because Python is not installed here; the repository's Python check remains in CI. This checksum identifies the local sideload build, not a future CI artifact.

## External and device checks still pending

No physical phone is currently connected in adb, so the new APK has not been installed or physically retested in this run. No microphones were started remotely, no personal PINs reset, and no real emergency calls/SMS/push were sent. Existing root.env/database/accounts were retained. Local emulator services had stopped; identities were restored from their existing database UID/phone mappings without altering DB rows, avoiding orphaned user records. Restarted emulator refresh sessions may require sign-in again on phones.

Firebase project **aegis-8972f** is selected, but CLI sign-in/public Android app configuration are pending. User selected **Supabase** for the database; connection details, verified TLS/PostGIS/private-schema/API-exposure checks have not run there. API/worker compute provider, billing approval, persistent disk and public HTTPS origins are still required. No Docker engine is available here, so container builds, migration/startup supervision in containers and remote operation remain unverified. No public backend is deployed; current Demo still uses PC/USB mappings. Hosted Pilot cannot be built for actual use until real public Firebase app identifiers and API origin exist.

Physical rehearsal must verify: both phones on mobile data without USB; invitation acceptance; one manual SOS, ACK confirmation and no resurfacing; resolution/revocation; GPS unavailable/stale; network loss/retry; Practice PIN then same-account step-up; foreground volume sequence; explicit word opt-in, cancellation and one actual controlled alert after countdown. OS notification/DND settings may suppress heads-up presentation; screen-off global volume detection remains unsupported. Fake providers, foreground-only inbox and fictional maps remain clear limitations. This is a controlled prototype, not a certified emergency release.
