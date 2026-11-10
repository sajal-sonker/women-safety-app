# 10 — Fake PIN, silent volume-key trigger, fake call and shake trigger

## Attribution

The **professor's latest feedback** suggested Fake PIN Mode and optional Low-Battery Auto-Location Broadcast alongside the team's silent volume-key emergency code. The team **skips the low-battery feature**. The uploaded outline independently lists shake/power-trigger and fake call. This document makes no claim that professor designed the team's sensing/routing innovations.

## Fake PIN (duress PIN) — committed P1, implementation dependent on risk review

**Meaning:** In the app's own PIN/lock interface, the user can define a separate duress PIN. Entering it presents an ordinary, preselected **decoy app screen** and discreetly requests the same SOS workflow, without an obvious in-app emergency animation.

Requirements:

1. Normal PIN and duress PIN must differ; both stored using salted, memory-hard verification where feasible in secure device storage, not plain text or client analytics. Prefer server-mediated/account-bound policy for reset without revealing secret.
2. Duress entry uses the same authenticated, idempotent `/sos` endpoint with `trigger_type='DURESS_PIN'`; generate a single event even if screen double-submits. Never fake a successful server acknowledgement.
3. Decoy screen must not expose alerts, map updates or stored safety contacts; configure OS notification preview suppression where permitted, but explain external SMS/network/phone UI cannot be guaranteed hidden.
4. Decoy still allows later exit/normal operation; avoid an easy-to-guess hidden gesture revealing the PIN. Offer an innocuous reset path that does not send a second SOS.
5. Secret setup requires deliberate consent, practice mode and clear instructions: duress PIN is **not guaranteed invisible** to an observer and does not lock the operating system.
6. False trigger UX: after a duress event is dispatched, cancellation cannot retract recipient messages. Confirmed false alarm may send a follow-up correction while leaving audit trail.

Threat model: coercer may watch screen, observe notifications, know app behavior, force OS unlock, control recipient or internet, or inspect activity history. This feature reduces visible interaction but cannot solve all coercion scenarios. Never promise complete secrecy.

## Volume-key emergency code — feasibility gated (EXPERIMENTAL)

**Goal:** user enters a distinctive volume-up/down sequence while app is usable to trigger SOS with minimal taps. Precise sequence is user-configurable and tested for accidental activation.

- Android normal `onKeyDown`/`dispatchKeyEvent` applies to focused app windows. **Do not promise global, locked-screen or background interception** based on these APIs. MediaSession is for genuine media handling and should not be abused to capture system volume keys.
- Spike on chosen Android versions/devices: app focused, background, screen off, phone call, headphones, music playback and locked. Log only test event outcomes, not key sequence secrets.
- Implement **foreground-window sequence** only if accessible and compatible; add an explicit quick settings tile, persistent SOS notification action or home widget as reliable alternative for situations where global key capture is unavailable.
- Do not hijack official Android/ERSS 112 power-button emergency gesture, require AccessibilityService hacks, or intercept normal volume controls without clearly disclosed permissions and validation.
- Sequence should have collision protection, rate limit and optional short cancel opportunity *only if no dispatch has occurred*; manual SOS should never be slowed by countdown.

## Shake / struggle activation — situational

During user-started monitoring sessions, accelerometer threshold + temporal pattern may request a discreet confirmation, or contribute to ML fusion. Do **not** make raw vigorous movement alone an always-on automatic SOS: running, traffic, sports and phone drops cause false positives. Outside active monitoring, shake auto-detection is off unless OS permits a separate clearly activated user-visible function.

## Fake incoming call — committed P1

- User selects immediate/scheduled simulated call, display name (clearly user-configured), ringing/vibration style and privacy settings.
- The UI is explicitly an **in-app simulation**, not a forged telephony call or a guarantee the call won't be distinguished from a real one.
- Works without network and must not automatically generate SOS unless user selects a distinct option.
- If real incoming call arrives, app respects OS telephony and audio focus; test accidental appearance on lock screen and notification settings.
- Background/locked scheduling uses a permitted reminder that opens the simulation after user interaction; exact timing/full-screen presentation is not guaranteed. No calling/alarm-role or privileged full-screen/exact-alarm entitlement is assumed. This is the defined platform fallback for FAKE-01, not a promise to impersonate system telephony.

## Acceptance table

| Feature | Must demonstrate | Failure behavior |
|---|---|---|
| Duress PIN | demo pin → decoy UI → one server event → receiver notified | offline shows no false 'delivered'; manual shortcut available |
| Focused volume sequence | specified physical key sequence works in focused Android app | disable feature on unsupported devices, use notification shortcut |
| Background key sequence | real-device observation only; requires approved approach | do not promise functionality or ship misleading toggle |
| Fake call | scheduled call appears in-app with no provider | app can always dismiss without SOS |
| Shake | calibrated classifier in explicit monitoring session | no claims while app/permissions inactive |
