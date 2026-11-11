# Working prototype: demo checklist

The user confirmed on11 November2026 that the goal is a working demo prototype. The black/purple theme, manual SOS, journeys, discreet controls, private evidence, export/deletion and offline sound check-ins are implemented. Use the existing local backend, Auth emulator, simulated delivery and fictional route/shop fixtures. Production accounts, hosting, release signing and independent release approval are not prerequisites for this demo.

## Do now: connect your Android phone

1. Keep the PC and phone together. Start the local services using [RUNNING](../RUNNING.md) if they have stopped.
2. At the repository root run `npm run doctor`. On this PC, if global Node is older, first run `$env:PATH=(Resolve-Path .tools).Path+';'+$env:PATH`, then use `npm.cmd run doctor`. The check reads configuration privately and prints readiness, never secrets or OTPs.
3. Enable USB debugging on an arm64 Android10+ phone, connect USB and accept the authorization prompt.
4. Run `powershell -ExecutionPolicy Bypass -File scripts/phone-test.ps1 -Install`. The local bundled demo APK needs no Metro server.
5. Follow [PHONE_TEST](PHONE_TEST.md). Use the seeded emulated owner `+16505550101`; read the OTP locally from the Auth emulator. Test simulated SOS/inbox/acknowledgement, journeys, permission denial, fake call, PIN rehearsal, evidence and audio Stop/offline behavior.
6. Record phone model, Android version, permission state and actual failures. One phone is enough for this prototype rehearsal; use a separate PC browser profile as the recipient. Broader device/battery certification is outside the demo target.

The phone cannot be authorized from this PC without accepting its USB prompt. Notifications, OEM power management, real incoming-call behavior, TalkBack and microphone indicators require physical observation. Share the observations and errors; do not share OTPs, personal recordings or credentials.

## Rehearse the working flow

1. Sign in on the phone as the emulated owner `+16505550101`. In a separate PC browser profile at `http://localhost:3000`, sign in as contact1 `+16505550501`.
2. Send a simulated SOS from the phone. In the recipient browser, open Test inbox, follow the private tracking link and acknowledge. Resolve from the owner and check tracking revokes.
3. Compare the fictional Lucknow routes; start a journey and mark arrival. Explain that this is sample route data.
4. Rehearse fake call and PIN practice. Demonstrate duress sending only if you deliberately intend another simulated SOS.
5. Enable sound monitoring visibly, grant permissions and show the active notification/window counter. Stop it and verify the microphone closes. An audio check-in asks for manual confirmation; it does not automatically send an SOS.
6. If included in your presentation, demonstrate selected-recipient evidence and consent withdrawal, then private export. Test account deletion last because it disables that account.

For a reliable presentation, show the actual sound-monitoring state and only demonstrate prompts you have observed on your phone. Detection may miss a sound or prompt on ordinary noise. Do not present a generated fixture, UI simulation or training-tool smoke test as measured distress recognition.

## What to explain in the demo

The bundled model recognizes general sounds and can ask for confirmation. It does not recognize the words Help/Bachao and never sends an automatic ML SOS. The training/export/calibration/evaluation tools are implemented, but a specialized phrase model is future work requiring consented/licensed recordings. The larger research graduation protocol is not a prerequisite for demonstrating this baseline. See the [ML guide](../ml/README.md) if you choose that extension later.

OTP and recipient messages are simulated locally. Shops/routes are fictional. Present the end-to-end prototype behavior without claiming real emergency delivery, police dispatch, validated safety predictions or production readiness.

Production/live-service work is deferred by the user's scope decision. Historical [Phase3](validation/phase-3.md), [Phase4](validation/phase-4.md) and [local evidence](validation/final-local-work.md) preserve the original acceptance boundaries; missing production gates do not block this prototype. The remaining demo task is to run the phone rehearsal and fix any observed failures.
