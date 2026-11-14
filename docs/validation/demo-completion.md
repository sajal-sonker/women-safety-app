# Final prototype readiness —14 November2026

Phase:4 follow-up, authorized prototype completion. Source baseline main `dbf71ee`; the user confirms the **previously configured PC remains the server**. No server migration, production deployment or provider onboarding is part of this completion pass.

Completed:

- Reviewed current app/ML/receiver work against [PRD](../02_PRD.md), [Aegis polish evidence](aegis-polish.md) and [VPN validation](pc-vpn.md). Existing manual SOS, invitations/recipient ACK, journeys, offline Help/Bachao, motion, PIN, volume, fake call and privacy features remain implemented. This pass does not invent physical-phone acceptance or model accuracy.
- Fixed a packaging gap: the APK helper previously served the mutable Gradle output, allowing a later USB build to replace the advertised VPN APK. `build-private-vpn-phone.ps1` now invalidates the candidate receipt before building; a successful build records its Demo endpoint/project, source revision, contract, bytes and SHA256. Publish checks those values, refuses stale/changed/wrong-host artifacts, verifies the copied bytes and serves a fixed `.local/published/aegis-demo.apk`. Failed candidate validation preserves the previous published APK. No credentials or signing material are put in Git or exposed by the download helper.
- Added `npm run verify:pc`: read-only private-profile/artifact verification followed by private API/database, demo Auth and APK HEAD probes. It rejects the old helper marker, wrong-sized downloads, unhealthy database response and unreachable services. Requests are GET/HEAD only, redirects refused and waits bounded; no OTP enumeration, SOS, location, microphone or account mutation.
- Consolidated the current [demo checklist](../USER_CHECKLIST.md), updated [VPN steps](../PC_VPN_DEMO.md) and removed contradictory active hosting/USB requirements from the README. Older USB instructions are explicitly a fallback. CR-011 records the user's server decision. Agent context remains on its handoff branch.

Contract changes: none. Current generated contract remains `56c07ea3fe5250f7c50a85ea41fc5b07f493c0798f1a6cbd8324f692d5523a5c`; no API/schema/migration, native feature, automatic-SOS threshold or permission change.

Tests executed on this development PC:

| Check | Result |
|---|---|
| `npm test` |50 passed,0 failed; isolated PostgreSQL/PostGIS. New tests cover fixed publication after a later USB build, stale source/contract/endpoint/checksum refusal, private-only configuration and readiness failures |
| `npm run test:mobile` |39 passed,0 failed |
| `:app:testDebugUnitTest` |40 passed,0 failures/errors; Android/Kotlin build successful. Existing Gradle/deprecation warnings remain |
| Typecheck, lint, generated contracts, Markdown links/repository guard |Passed |
| PowerShell build/setup syntax |Parsed without errors; no Tailscale configuration changed here |
| `verify:pc` on the non-server checkout |Correctly refuses missing private profile/configuration; no resources created or migrated |

Real-device results: **not run**. This PC has no Tailscale installation or the original server's ignored `.local/pc.env`/`.local/vpn.json`. That server's Auth snapshot/signer were not transferred or verified in this pass. The local old localhost APK is not the VPN deliverable. A new server-specific APK was deliberately not built here. Existing server-side HTTPS/Auth/full APK-download checks are historical results in `pc-vpn.md`, not new remote verification. Browser sources are unchanged in this pass; the previous six-test browser result is recorded in `aegis-polish.md`.

Security/privacy review: publisher checks the existing private server origin, demo application/project and current committed source/contract; changed file bytes cannot be published under a prior receipt. Only the fixed APK route is served, directory traversal/private file access/writes remain rejected. Readiness checks never print private URLs, responses, OTPs or secrets. Existing server database, private profile, auth state, VPN identity and signing material were not touched. Tests use synthetic fixtures and generated temporary files with checked cleanup paths.

Remaining operator/device steps: on the original server pull `main`, restart only its old `dev:pc` terminal to load the new helper (retain Auth), run the build/publish/verify commands in the checklist, update both phones from that private URL, then rehearse over mobile data: invitation, one SOS, saved response/no resurfacing, resolution, journey, network/permissions, Voice countdown/cancel and controls. Physical microphone/notification/OEM behavior and two-phone delivery remain pending until observed. Keep the server awake and receiver app foreground. Real SMS/push, paid cloud hosting, shop onboarding and independent release certification remain deferred.

Next prerequisites: software changes are reviewable/tested; original-server update and physical acceptance are required for the final demonstration. No zero-bug, guaranteed delivery or guaranteed safety claim is made.
