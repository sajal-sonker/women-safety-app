# 08 — Situational on-device distress detection (experimental feature)

## Core intent

Enable a deliberate **Safety Monitoring Mode** when a user feels unsafe or starts a journey. Audio and motion analysis run on-device; the app does **not** listen 24/7. Detection is assistance-oriented, not a guarantee. Manual SOS is always independent and immediate.

## Operating model

- User starts monitoring from visible app UI; permissions requested contextually. A persistent, user-visible Android foreground service/notification and a clear stop control indicate active monitoring.
- Under the review baseline, API33+ notification denial/revocation disables/stops audio monitoring to preserve that UX; manualSOS remains available. This is a conservative product policy, not an Android-wide requirement for all foreground services. Session duration/expiry uses monotonic time; see integration section11.
- On-device classifier consumes short rolling audio windows (e.g. 1–2s), looking for screams or distress phrases such as 'bachao' and 'help'; distinguish background TV/traffic/shouting. Do not upload continuous raw audio.
- Android native accelerometer pipeline extracts acceleration magnitude, jerk, orientation transitions, successive spikes and drop/snatch-like patterns; walking/jogging/vehicle bumps are hard negatives.
- A fusion decision uses a **temporal window** (proposed ±3s), audio confidence, motion anomaly, context and calibration. Both signals support higher confidence but are not always both required: rigid AND would miss silent attacks or stationary distress.
- Risk classes: `NORMAL`, `SUSPICIOUS` (discreet check-in), `HIGH_CONFIDENCE` (countdown/cancel when safe, then SOS). User may disable automatic dispatch and choose confirmation-only mode.
- No microphone/audio capture in the background unless a legally permitted foreground service was correctly started **while UI was visible** and remains active. If OS kills/restricts service, show degraded state; do not silently claim coverage.

## Architecture and lifecycle

```
React Native monitoring UI
   ↓ start explicitly / permissions / foreground notification
Android Kotlin ForegroundService
   ├─ AudioRecord → on-device LiteRT audio model
   ├─ SensorManager → motion feature extractor
   └─ calibrated fusion + refractory/cooldown → React Native SOS bridge
   ↓
Fast SOS transaction (06_SOS_AND_RESPONDER_FLOW.md)
```

Processing should stop immediately when user ends session, session expires, microphone is revoked, or phone enters unsupported mode. Start with conservative data/battery budgets and actual device profiling; avoid claiming screen-off effectiveness until measured.

## Training and data handling

- Build a **consented, non-harmful** dataset: staged distress phrases in Hindi/English, natural speech, TV/audio playback, transport, running/jogging, falls without distress; document consent and license.
- Use class-balanced train/validation/test split by *speaker*, *environment* and *recording session* to prevent leakage. Do not include real victim recordings without explicit ethical review.
- Train a lightweight CNN/embedding classifier as benchmark; calibrate thresholds on held-out recordings; export quantized model to LiteRT.
- Track per-class precision/recall/F1, false alarms/hour, missed-detection rate, CPU, RAM, p95 infer latency, battery use per monitoring hour, microphone availability/permissions, Hindi accent variation and noisy backgrounds.
- Synthetic positive samples don't validate real attack detection; report this limitation in demo.

## Prototype graduation criteria (targets, not results)

- Demonstrate offline inference without network on two physical Android models spanning OS/API versions.
- Report stratified held-out performance and false-alarm rate over ≥2 hours staged everyday audio/motion; do not ship auto-dispatch if results are uncertain.
- The ≥2h exercise above is a smoke test only. Graduation requires the dataset, ≥30h negatives, event-level metrics/95% intervals, quantization parity and device budgets in [TESTING_AND_ACCEPTANCE_GATES.md](TESTING_AND_ACCEPTANCE_GATES.md). Default confirmation-only; auto-dispatch remains disabled unless every M01–M08 gate passes independent review. No metrics have been measured yet.
- Demonstrate behavior for mic permission denied/revoked, phone locked, app backgrounded after valid start, calls/audio focus conflicts, service killed, long journey, headphones, noisy transit.
- Verify service stops and releases microphone on user stop. No accidental media upload; evidence recording requires a *separate* consent and permission design.
- Default to user-controlled/manual SOS when monitoring unavailable or failed validation.

## Why model fusion matters

Two weak detections do not automatically become one strong event. Evaluate correlation between motion and audio false positives (e.g. sports, cheering, rough bus ride), compare audio-only, motion-only, strict-AND, weighted-fusion and user-confirmation strategies. Optimize for both missed emergencies and intrusive false alarms. Never train a model to classify a person as a criminal or infer intent from voice.
