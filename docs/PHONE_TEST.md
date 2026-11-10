# SurakshaAI phone test

The latest arm64 demo APK includes a bundled offline YAMNet sound model and native microphone/motion check-ins. It uses debug/demo signing and local fake providers. It is a controlled test build, not an accepted emergency deployment. You can perform the real-device matrix below; no physical-device pass is claimed by the executor.

## Connect and run

1. On the PC follow [RUNNING](../RUNNING.md): local PostGIS, Auth emulator, migrated/seeded API/worker/web. Keep their terminals running. The bundled APK needs no Metro server.
2. Enable Android USB debugging, connect the phone and accept its authorization prompt. Android10/API29+ and arm64 are this artifact's target; build the correct ABI for another device.
3. From PowerShell at the repository root run `powershell -ExecutionPolicy Bypass -File scripts/phone-test.ps1 -Install`. This process-only script flag does not change machine policy. Alternatively run `adb reverse tcp:4001 tcp:4001`, `adb reverse tcp:9099 tcp:9099`, then `adb install -r apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`.
4. Open SurakshaAI Demo. Use seeded emulated owner `+16505550101`. Request an OTP, then read the code in the local Auth emulator (or its verificationCodes endpoint). No real SMS is sent. In another browser profile use a seeded contact to view the simulated inbox and tracking link.

The phone build uses `http://127.0.0.1:4001` through USB reverse. An emulator build instead uses `-PapiBaseUrl=http://10.0.2.2:4001`. If rebuilding, use `:app:assembleDemo -PapiBaseUrl=http://127.0.0.1:4001 -PreactNativeArchitectures=arm64-v8a`. Reconnect/reverse after unplugging. Stop the test if the app reports a permission or service error; record its actual state.

## Audio/motion test

Open Controls. Read the audio consent, enable it, grant microphone and notification permissions, then explicitly start the30minute session. Wait for **ACTIVE_CONFIRMATION_ONLY**, microphone active and a nonzero windows counter. The model/buffer never goes to the server or into saved evidence. A persistent microphone notification has a Stop action. Stop, expiry, account change, permission loss, call/audio-focus conflict and process termination end/degrade monitoring; it never silently restarts.

YAMNet detects general sound events including scream-like sounds. It does not understand Help/Bachao words or infer an attack. Ordinary TV/shouting/music may cause false prompts; quiet speech/real distress may be missed. A prompt never creates an SOS automatically. Confirm explicitly using the normal SOS button if testing dispatch. Keep tests non-harmful; do not stage dangerous situations or call112. Training a Hindi/English phrase classifier still requires private consented recordings; the reproducible pipeline is in [ML instructions](../ml/README.md).

For an offline inference test, sign in/start while connected, switch the phone to airplane mode, and check that the window counter continues. Manual SOS will be queued/unknown until the server is reachable. This proves only local execution, not audio accuracy. Stop and verify the microphone indicator/notification closes; independent SOS/journey location should continue if deliberately active. Separate evidence audio requires stopping monitoring first, avoiding two competing microphone recordings.

## Record actual observations

| Case | What to record |
|---|---|
| Permissions denied/revoked | OS/model/API; manual SOS/dialer available, monitoring inactive/degraded, no invisible microphone |
| Home/lock/screen-off/Doze/battery saver | Start visibly first; notification/indicator, elapsed time/windows, observed stop or degradation |
| Stop/expiry/force-stop/reboot | Microphone release, no restart without a new deliberate start; native manual journal reconciliation remains truthful |
| Real incoming call/music/headphones | Audio conflict ends/degrades capture and releases resources; fake-call sound stops on focus loss |
| Audio + motion negatives | TV, conversation, walking, transit/music; count all check-ins and exposure, not only successes |
| Normal/duress/practice PIN | Normal/practice0SOS; duress one durable intent/Notes; test offline and double tap. External notifications/recipient messages can expose it |
| Evidence | Chosen recipients only; capture stops on background/withdrawal; no evidence before accepted SOS; consent withdrawal revokes reads |
| Accessibility | TalkBack labels,48dp actions, large font, one-hand use, English/Hindi consent comprehension |
| Battery/performance | Record model/windows/p95 inference/PSS diagnostics; matched60min idle/location/audio runs and thermal state,3repeats/device |

Use two phones before claiming the documented support/energy gates. Record failures as failures; neither a build nor a successful smoke test proves reliable emergency detection. Production provider/hosting/storage/scanner/signing resources, operational shop agreements, real map data and independent acceptance remain separate prerequisites.
