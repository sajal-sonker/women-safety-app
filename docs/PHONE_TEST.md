# SurakshaAI phone test

The latest arm64 demo APK includes bundled offline English/Hindi speech models for Help/Bachao recognition, YAMNet sound classification and native microphone/motion check-ins. It uses debug/demo signing and local fake providers. It is a prototype test build. You can perform the real-device matrix below; no physical-device pass is claimed by the executor. Both language models are bundled; first start copies about153MB of public model weights into private app storage and may take several seconds. Allow free storage for the larger APK and extracted weights.

## Connect and run

1. On the PC follow [RUNNING](../RUNNING.md): local PostGIS, Auth emulator, migrated/seeded API/worker/web. Keep their terminals running. The bundled APK needs no Metro server.
2. Enable Android USB debugging, connect the phone and accept its authorization prompt. Android10/API29+ and arm64 are this artifact's target; build the correct ABI for another device.
3. From PowerShell at the repository root run `powershell -ExecutionPolicy Bypass -File scripts/phone-test.ps1 -Install`. This process-only script flag does not change machine policy. Alternatively run `adb reverse tcp:4001 tcp:4001`, `adb reverse tcp:9099 tcp:9099`, then `adb install -r apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk`.
4. Open SurakshaAI Demo. Use seeded emulated owner `+16505550101`. Request an OTP, then read the code in the local Auth emulator (or its verificationCodes endpoint). No real SMS is sent. In another browser profile use a seeded contact to view the simulated inbox and tracking link.

The phone build uses `http://127.0.0.1:4001` through USB reverse. An emulator build instead uses `-PapiBaseUrl=http://10.0.2.2:4001`. If rebuilding, use `:app:assembleDemo -PapiBaseUrl=http://127.0.0.1:4001 -PreactNativeArchitectures=arm64-v8a`. Reconnect/reverse after unplugging. Stop the test if the app reports a permission or service error; record its actual state.

## Audio/motion test

Install the rebuilt APK with `scripts/phone-test.ps1 -Install` before retesting. Open **Home → Manage voice check-in** or **More → Voice check-in**. Read and enable voice/motion consent, grant microphone and notification permissions, then tap **Start listening**. Wait for **Listening**. Expand **Session details** to inspect **ACTIVE_CONFIRMATION_ONLY**, phrases **ACTIVE**, microphone active and an increasing windows counter. During **Preparing**, **Cancel start** remains available. Use **Stop listening** to end the session. Public model weights are cached locally; microphone buffers/transcripts never go to the server or into saved evidence. A persistent microphone notification has a Stop action. Stop, expiry, account change, permission loss, call/audio-focus conflict and process termination end/degrade monitoring; it never silently restarts. An unavailable/corrupt language model stops/degrades the session visibly.

Say **Help**, **please help me**, **बचाओ** or **मुझे बचाओ**, then pause so the speech recognizer can finalize the word. Voice check-in shows the last recognized target and the corresponding check-in. English/Hindi engines run together; there is no language switch. A shared120s cooldown limits repeat sound/phrase prompts. For a quick separate-word demonstration, Stop and explicitly start a fresh consented session between Help and Bachao. Say ordinary phrases/nearby words too, including hello, helper, बताओ and बनाओ; record any false prompts rather than discarding them.

Vosk recognizes words; YAMNet separately detects general sound events including scream-like sounds. Neither infers an attack. Ordinary TV/conversation may cause prompts; noise, quiet speech, accents or distress may be missed. A prompt never creates an SOS automatically. Confirm explicitly using the normal SOS button if testing simulated dispatch. Keep tests non-harmful; do not stage dangerous situations or call112. [ML instructions](../ml/README.md) describe the pretrained baseline and optional custom training tools.

For an offline inference test, sign in/start while connected, switch the phone to airplane mode, and check that the window counter and Help/Bachao recognition continue. Manual SOS will be queued/unknown until the server is reachable. This proves local execution, not general recognition accuracy. Stop and verify the microphone indicator/notification closes; independent SOS/journey location should continue if deliberately active. Separate evidence audio requires stopping monitoring first, avoiding two competing microphone recordings.

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

## Retest the reported phone issues

The 12 November update fixes a reproduced Android rendering exception after word recognition and removes frequent process-memory scans from the UI thread. See [verification](validation/phone-feedback-fixes.md). The reported Moto Android16 ANR has not been physically reproduced without the phone/logs. Test Help and Bachao separately, leave the session running briefly, then verify Stop responds and the microphone indicator closes. If Android still says “not responding,” record the exact time, whether a recognized-word label appeared, and whether it happens during loading or listening.

Navigation is now **Home / Journey / Contacts / More**. Fake call, App PIN & duress, Demo help points, Alert history and Privacy & data each have their own page under More. Back returns to the More menu. Optional diagnostics and explanations are expandable.

In the contact browser open **Received alerts** before sending a simulated SOS. Keep it visible and online: the inbox and tracking status refresh automatically about every1.5seconds after each completed request batch. A connection failure retries automatically; returning to the tab or reconnecting wakes polling. You should not need to reload the page. Offline/background tabs pause; this prototype has no closed-browser push delivery.
