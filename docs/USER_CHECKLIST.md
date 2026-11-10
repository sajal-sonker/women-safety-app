# Your next steps

The controlled local app is ready for phone testing. The black/purple theme, manual SOS, journeys, discreet controls, private evidence, export/deletion and offline sound check-ins are implemented. Real emergency delivery, validated Help/Bachao recognition and production launch still need the resources and evidence below.

## Do now: connect your Android phone

1. Keep the PC and phone together. Start the local services using [RUNNING](../RUNNING.md) if they have stopped.
2. At the repository root run `npm run doctor`. On this PC, if global Node is older, first run `$env:PATH=(Resolve-Path .tools).Path+';'+$env:PATH`, then use `npm.cmd run doctor`. The check reads configuration privately and prints readiness, never secrets or OTPs.
3. Enable USB debugging on an arm64 Android10+ phone, connect USB and accept the authorization prompt.
4. Run `powershell -ExecutionPolicy Bypass -File scripts/phone-test.ps1 -Install`. The local bundled demo APK needs no Metro server.
5. Follow [PHONE_TEST](PHONE_TEST.md). Use the seeded emulated owner `+16505550101`; read the OTP locally from the Auth emulator. Test simulated SOS/inbox/acknowledgement, journeys, permission denial, fake call, PIN rehearsal, evidence and audio Stop/offline behavior.
6. Record phone model, Android version, permission state and actual failures. Two phones and measured battery/lifecycle runs are needed for support claims; one phone is enough to start testing.

The phone cannot be authorized from this PC without accepting its USB prompt. No phone is currently attached. Notifications, OEM power management, real incoming-call behavior, TalkBack and microphone indicators require physical observation. Share the observations and errors; do not share OTPs, personal recordings or credentials.

## To complete phrase recognition

The bundled model recognizes general sounds and can ask for confirmation. It does not recognize the words Help/Bachao and never sends an automatic ML SOS.

Provide access to consented/licensed recordings with pseudonymous speaker/session/environment IDs and real onset labels. The [ML guide](../ml/README.md) now includes CSV preparation, training/export, actual inference, validation-only calibration, a separate frozen threshold and held-out scoring. You do not need to build JSON files manually. Keep recordings and catalogs in ignored `.local/private-ml/` or outside this repository.

The documented graduation protocol needs40 independent speakers split24/6/10, at least150 held-out events for each positive class,30hours of held-out negatives and two-device exposure. Generated smoke-test sounds do not count. A reviewed, measured candidate still needs mobile integration and device evaluation before replacing the sound baseline or enabling any automatic feature. Dataset rights and participant consent cannot be supplied by the coding agent.

## Before a live release

These are separate from testing the local APK:

| You/your team provide or decide | Follow-up engineering/validation |
|---|---|
| Firebase project and phone-auth configuration; production signing ownership | Configure real auth, signing fingerprints, release build and auth/device tests |
| Approved SMS provider, sender/templates, permitted delivery path and budget | Implement/review the selected adapter, webhooks, retry/unknown-outcome handling and test numbers; current adapters remain fake |
| Hosting/domain/region, restricted database, private object storage and scanner accounts | HTTPS deployment, real storage/scanning integration, backup/key rotation/restore/monitoring and retention drills |
| Pilot city, validated street/lighting data, shop-owner agreements | Import and assess sources; verify actual shop participation before enabling alerts |
| Physical devices and an independent technical/privacy reviewer | Run the remaining device/security/provider/acceptance gates and record their decisions |

Keep keys in a private environment or secret manager, never chat or Git. The app cannot promise police dispatch, guaranteed delivery or safety. [Phase3](validation/phase-3.md), [Phase4](validation/phase-4.md) and the latest [local completion report](validation/final-local-work.md) separate implemented software from these open gates.
