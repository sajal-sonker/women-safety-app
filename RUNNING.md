# SurakshaAI controlled local demo

This implementation is for a controlled demonstration. It never sends real emergency SMS/push. Phone verification is emulated; all seeded contacts, routes, reports and shops are fictional. The Lucknow walking grid is not an imported street map and must not be used for travel.

## Requirements and setup

Use Node **26.13.0**, npm **11.20.0**, PostgreSQL **17** with PostGIS **3.6**, and JDK **21** for the verified Android build. Docker Compose is an optional convenience for PostGIS/Auth; it was not available in the implementation environment. Local verification instead used native PostgreSQL17.11/PostGIS3.6.2 and the Firebase Auth emulator. All app packages share the root npm lockfile. On PowerShell, use `npm.cmd`/`npx.cmd` if script execution policy blocks npm.ps1; do not change machine policy. On this PC a pinned Node/npm lives under ignored `.tools`; prepend it with `$env:PATH=(Resolve-Path .tools).Path+';'+$env:PATH`. Run `npm run doctor` to check local services/artifacts and phone connection without printing secrets. See [your checklist](docs/USER_CHECKLIST.md).

From the repository root:

```sh
npm ci
node scripts/init-env.mjs
```

The second command creates ignored `.env` with fresh encryption/database/receipt secrets. It refuses to overwrite an existing file. Never paste `.env` into an issue, commit it, or replace the encryption key while keeping encrypted database records.

Choose one local database setup:

- Docker: `docker compose --env-file .env -f infra/compose.yaml up -d db`. The database is loopback port54329, user/database `suraksha`; generated `.env` matches it. Container image tags are versioned but not digest-locked; deployment hardening remains Phase4.
- Existing PostgreSQL: create a local database/user, install PostGIS, and change ignored `DATABASE_URL` to match. Initial migration needs extension-creation permissions. `npm test` creates **suraksha_test** on the same loopback server, so that local user also needs CREATEDB. Tests truncate only that explicitly named test database.

Start authentication in a separate terminal:

```sh
npm run auth:emulator
```

The demo project is `demo-surakshaai`, Auth port9099 and UI port4000. Alternatively use `docker compose --env-file .env -f infra/compose.yaml up -d auth`; do not start both. Docker config listens within its container, while published ports bind only localhost. The host configuration binds loopback directly. Emulator tokens are accepted only in local mode. See [Firebase emulator guidance](https://firebase.google.com/docs/emulator-suite/connect_auth).

Then:

```sh
npm run db:migrate
npm run seed:demo
npm run dev
```

Open **http://localhost:3000**. Use `localhost`, not `127.0.0.1`, for the web UI because cookie mutation Origin checks match `WEB_ORIGIN`. API is http://127.0.0.1:4001/v1; API and worker are separate processes. Migrations are checksum-verified; never edit an applied SQL file. Seed is local-only and repeatable, but does not reset previously mutated demo records. Restarted auth emulators need seed again to restore stable test UIDs.

## Accounts and demonstration

| Role | Emulated phone |
|---|---|
| Owner with five seeded verified trusted contacts | +16505550101 |
| Second owner with no seeded contacts | +16505550102 |
| Trusted contact1 through5 | +16505550501 through +16505550505 |
| Moderator | +16505550199 |
| Shop owner | +16505550188 |

Request a verification code in the app. Read the generated code in the Auth emulator UI/terminal; no actual SMS is sent. Seeded contact verification is a fixture convenience only. New contacts go through invitation and invited-phone acceptance.

1. Sign in as owner and send a **test** SOS. An accepted event means persisted/queued, never confirmed delivery.
2. In a separate browser profile sign in as contact1, open **Test inbox**, refresh, and follow the private fragment link. Only the signed-in phone's fake messages are visible. Fake messages expire after two hours.
3. Explicitly open tracking, acknowledge assistance and enter an ETA. The portal exposes only this alert, its shared location/context and the recipient's own acknowledgement.
4. Resolve from the owner. Tracking revokes on the next request/poll. Last-known/stale/unavailable location is always labelled; no coordinates is still a valid SOS.
5. Compare routes using default coordinates `26.848,80.943` to `26.852,80.949`. Only a tiny fictional grid near Lucknow is covered. Change departure time to compare day/night estimates. Indicators describe estimated conditions; coverage and unknown inputs are shown.
6. Start a journey, choose escalation and optional sharing explicitly, then arrive, extend, cancel or request help. Default sharing is off. Server timers use UTC; overdue auto-escalation has a two-minute grace. After escalation, arrival does not resolve the linked SOS.
7. Shop owner uses `/shops` to apply/manage availability; moderator uses `/admin` to review reports/shops. Unapproved reports have no public effect. Public report cells require at least three independent reporters and hide precise coordinates/identities. Fictional shops are not promises of assistance.

The browser owner console demonstrates the API. Durable offline SOS journaling belongs to the Android implementation; do not claim offline durability for a web page.

## Android

Android **10/API29+**, target/compile36, build-tools36.0.0, JDK21, NDK27.1.12297006, CMake3.22.1, Gradle9.4.1, Kotlin2.2.0, React Native0.88.1, React19.3.0 and MapLibre11.5.1. These versions compiled together. The template's unavailable SDK37 was replaced by36; see [native evidence](apps/mobile/docs/platform-spikes.md). No iOS implementation is included.

Set `JAVA_HOME`, `ANDROID_HOME` and SDK platform-tools PATH, then start Metro from root:

```sh
npm run mobile:metro
```

In another terminal:

```powershell
Set-Location apps/mobile/android
.\gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

On Linux use `./gradlew`. The debug APK is `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`; it is ignored by Git. CI also builds an APK artifact. This **debug** build uses Metro; it is not a standalone signed release. Physical runtime behaviour has not yet been verified.

For Android emulator, API defaults to `http://10.0.2.2:4001`, Auth to port9099. Build for the emulator's actual ABI, e.g. `-PreactNativeArchitectures=x86_64`, then `adb install -r <apk>`. x86_64 has not been compiled in this run. For a USB phone, use `-PapiBaseUrl=http://127.0.0.1:4001` and:

```sh
adb reverse tcp:4001 tcp:4001
adb reverse tcp:9099 tcp:9099
adb reverse tcp:8081 tcp:8081
```

Install and launch the app. Request location from its visible UI before testing background location. Denial must still allow location-free SOS and the112 dialer. Tracking starts only for a deliberate active SOS/journey, with a visible location foreground service. Optional offline sound monitoring starts separately from visible Controls with explicit microphone consent and a persistent Stop notification; it never automatically sends an SOS. There is no boot auto-start or background-location permission. Foreground services do not guarantee survival after OS/user termination; test real devices before relying on them. [Android service prerequisites](https://developer.android.com/develop/background-work/services/fgs/service-types#location) apply.

## Verification and recovery

```sh
npm run contracts:check
npm run typecheck
npm run lint
npm test
npm run test:mobile
npm run build
npm run verify:docs
```

`npm test` uses a real isolated PostGIS database and injected test identity verifier. `npm run test:mobile` mocks native services. Browser tests require the separately running Auth emulator, migrated/seeded app DB, API, worker and web, plus `npx playwright install chromium`; then `npm run test:web`. They exercise real emulated OTP, fake messages, ACK/revocation and journey arrival. No suite sends real messages. Full fault injection, performance/device, security and independent review remain open in the [evidence reports](docs/validation/phase-1.md).

Stop development processes with Ctrl+C. Preserve DB volumes, outbox, intent tombstones and `.env`. Restart services and let leased work recover; do not manually replay already-attempted messages. Native SOS retries silently for at most five minutes, then requires reconfirmation; local stop during disconnection cannot confirm remote revocation. Terminal server state revokes portal access. A failed route evaluation has a manual-ETA journey fallback and cannot hold the SOS database connection pool.

Live configuration is intentionally blocked: approved SMS provider/sender/templates, a permitted push path, real Firebase project settings, HTTPS hosting, restricted DB roles, retention/privacy review and validated street data are external prerequisites. FCM is not enabled for emergency delivery because of [official usage guidance](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority). Do not enable it by renaming a fake adapter.

## Advanced controls and privacy

CR-004 update: offline YAMNet audio/motion check-ins are now available through a visibly started microphone foreground service, with notification Stop and explicit consent. The motion-only paragraph below describes the older fallback. CR-005 adds bundled offline English Help and Hindi Bachao/बचाओ recognition with explicit local phrase consent; automatic sensor dispatch remains disabled. The newest phone APK uses USB-loopback127.0.0.1; use [phone setup and matrix](docs/PHONE_TEST.md), including `scripts/phone-test.ps1 -Install`. [ML tools](ml/README.md) cover model verification, real interpreter smoke, training/export and held-out event evaluation.

The mobile Controls tab provides fake-call simulation/reminders, normal/duress PIN setup and rehearsal, a foreground-only motion check-in experiment and export/deletion. Setup/reset/export/deletion require a phone authentication within five minutes; sign out and sign in again after resolving active sharing if needed. Duress is not guaranteed hidden: Android location indicators, notification previews, network activity and recipient messages can reveal it. Rehearse without dispatch first. Automatic sensor dispatch and shop alerts remain disabled; sound-model check-ins are confirmation-only.

After an SOS is accepted, optional evidence requires separate consent and selected contacts. Local fake storage supports JPEG/PNG and =10sec16kHz mono PCM WAV, re-encodes images to remove metadata, quarantines before processing and streams only to current authorized recipients. MP4, a real malware scanner/private object host and geocoder are not configured. Native photo uses the system camera preview; audio stops when the app leaves foreground. Browser Controls & privacy provides24h private export and account deletion status.

Run `npm run test:monitoring`, `npm run test:security`, `npm run test:load`, and `npm run ml:evaluate`. The last command returns exit2 without private data/model, never a fake ML pass. See [operations](infra/OPERATIONS.md) for encrypted backup/restore and the separate erasure ledger. `npm run restore:verify -- <archive>` replaces only the explicitly named local restore-test database.

A bundled arm64 controlled-demo APK can be built with `./gradlew :app:assembleDemo -PreactNativeArchitectures=arm64-v8a` (Windows: `.\gradlew.bat`). This uses local debug signing, `.demo` application ID and emulated auth/local HTTP; it is not a production signed release. Production release signing is deliberately unconfigured. Final artifact/build observations are in [Phase4 evidence](docs/validation/phase-4.md). Physical/device claims remain pending.
