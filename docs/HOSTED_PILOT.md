# Aegis hosted pilot

The user selected fully hosted access over mobile data and Firebase project **aegis-8972f**. The repository now has container entry points and a separate HTTPS-only Android Pilot variant. **No public backend has been deployed and no hosted URL is configured yet.** The current Demo APK still uses the PC and USB port mappings.

## What is deployable

This is a controlled pilot: signed Firebase phone authentication, persisted SOS/contacts/journeys, foreground Android recipient polling, response acknowledgements and explicit local monitoring. Maps, shops and incident examples remain fictional Lucknow fixtures. SMS/push adapters remain fake; a sleeping/closed recipient app is not notified. Hosting does not turn those adapters into real emergency delivery. Do not advertise this build as a production emergency service.

Firebase Authentication does not itself run this Node API, its scheduled worker, or PostgreSQL/PostGIS. Choose an actual compute/database deployment in Google Cloud or another provider; this choice and billing approval are still pending. Firebase Hosting alone is insufficient. Do not expose the Auth emulator or accept its unsigned tokens on a public endpoint ([Firebase warning](https://firebase.google.com/docs/emulator-suite/connect_auth)).

## Required topology and durable state

| Component | Repository entry | Requirement |
|---|---|---|
| API + worker | [Dockerfile.api](../infra/Dockerfile.api), [launcher](../scripts/start-hosted.mjs) | One always-running instance, HTTPS ingress to port4001, private DB access, persistent mounted `/var/data` |
| Database | `services/api/migrations/` | PostgreSQL17 with PostGIS; private network/TLS as required by provider, backups and restricted credentials |
| Optional browser console | [Dockerfile.web](../infra/Dockerfile.web) | HTTPS ingress to port3000, build-time public Firebase web config and API URL, runtime same API URL |
| Authentication | Firebase `aegis-8972f` | Phone provider enabled, Android app registered, appropriate SMS regions/quotas or configured fictional test numbers |

The launcher validates hosted configuration, applies checksum-locked migrations once, then supervises API and worker together. It does not seed real users or start emulators. If either child exits, it terminates the other so the host can restart the service. Use one replica; do not add a second worker or split services across independent ledger disks. Scheduled jobs must run even when nobody opens a webpage. A request-only serverless container that scales to zero or has an ephemeral filesystem does not satisfy these requirements.

`ERASURE_LEDGER_PATH` stores encrypted deletion tombstones outside the database restore boundary. Mount persistent storage, protect and back it up independently, and preserve its newest copy during rollback. A Docker image layer or `/tmp` is not durable storage. On Google Cloud, a persistent VM/container deployment is a straightforward fit for the current topology; Cloud Run would require a reviewed durable-ledger/storage and scheduling change first. No such infrastructure is provisioned by these files.

## Provisioning sequence

### Supabase database option selected by the user

Supabase can supply PostgreSQL/PostGIS; Firebase remains phone authentication and a separate Node host still runs API/worker. Do not replace the existing REST contract with Supabase client calls or ship database credentials/service-role keys to phones.

Provide the public project reference and region. Save the database URI privately as `DATABASE_URL=...` in ignored `.local/supabase.env`, not root `.env`; save the dashboard's root certificate as `.local/supabase-ca.crt`. The Session pooler URL uses port5432 and supports IPv4. Prefer a direct connection for the persistent backend when its host supports the project's networking; use session pooling for IPv4 hosts. Use the connection parameters shown by Supabase, not a guessed hostname. Database password characters in a URI must be percent-encoded. [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

Before migrations, use a dedicated pilot project, enable PostGIS in `extensions`, and turn the unused Data API off. The app relies on Firebase-verified server authorization, not Supabase Auth/RLS claims; exposing its tables separately would bypass that boundary. Do not grant anon/authenticated access to app tables. Provision a restricted application role and a private application schema with its role-specific search_path pointing first to that schema and then `extensions`; test migration/function visibility before deployment. Do not alter an existing project's extension schema or other applications' grants blindly. Confirm anonymous REST/GraphQL cannot read app data. [PostGIS setup](https://supabase.com/docs/guides/database/extensions/postgis), [Data API hardening](https://supabase.com/docs/guides/api/securing-your-api).

Use verified TLS for the remote DB. Add `sslmode=verify-full` and `sslrootcert` pointing to the certificate's mounted path in the host-side DATABASE_URL. Mount the certificate read-only and keep the password in the host secret manager; do not use rejectUnauthorized:false. node-postgres reads SSL URL parameters; do not also pass conflicting SSL object options ([driver documentation](https://node-postgres.com/features/ssl)). The project currently has no Supabase credentials and no connection/migration/exposure test against Supabase has run. The existing local PostGIS tests are not hosted-provider evidence. Plan connection capacity for both API pools and worker, plus migrations and Supabase's own services; reduce deployment concurrency before increasing replicas.

### Compute, authentication and installation

1. Finish `npx.cmd firebase login` in the prepared project terminal. Confirm the owning account can list `aegis-8972f`. CLI sign-in is not a substitute for the server's runtime Firebase Admin identity.
2. Select provider, region, always-on compute plan, persistent volume and private PostgreSQL/PostGIS plan. Review the provider's current cost estimate and approve billing before provisioning. Set one replica and automatic restart. No paid resources are created by this repository.
3. Set up the database extensions with an authorized DB role. Migrations create required extensions; if the runtime role cannot do so, pre-create them with the provisioner rather than elevating the application role permanently. Do not edit applied SQL/checksums. Start from an empty pilot database, not a copy of the PC's personal/demo records.
4. Store the values in [.env.pilot.example](../.env.pilot.example) in the provider's secret manager. Use newly generated random encryption/receipt secrets. Never upload root `.env`. For Google Cloud prefer a restricted runtime service identity/ADC; on another host inject `FIREBASE_ADMIN_CREDENTIALS_JSON` securely. It must belong to `aegis-8972f`. Never pass this JSON as a Docker build argument or put it in mobile resources.
5. Configure real HTTPS API and web origins. `WEB_ORIGIN` and `PUBLIC_TRACKING_BASE_URL` are origins only, without paths or tokens. CORS is exact-origin. Keep the web/API relationship consistent for cookie and CSRF checks. Unset `FIREBASE_AUTH_EMULATOR_HOST` entirely. Set `APP_ENV=pilot`, `CONTROLLED_DEMO=true`, fake providers and synthetic maps explicitly. The process refuses unsupported live-provider/production configurations.
6. Build and publish containers on a machine/CI with Docker. From the repository root:

   ```sh
   docker build -f infra/Dockerfile.api -t aegis-api:pilot .
   docker build -f infra/Dockerfile.web -t aegis-web:pilot \
     --build-arg API_BASE_URL=https://YOUR_API_HOST \
     --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=aegis-8972f \
     --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_PUBLIC_WEB_API_KEY \
     --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_PUBLIC_WEB_APP_ID .
   ```

   Deploy the API image with environment secrets and a persistent volume mounted at `/var/data`. The web image also needs `API_BASE_URL` at runtime. Configure host health checks at API `/v1/health/ready`; this only checks API/database readiness, not guaranteed delivery or worker liveness. Monitor the supervised process and worker tick failures separately. No Docker engine is available on the current PC, so these images have not yet been built or exercised here.
7. In Firebase Console register Android package **com.surakshaai.pilot**, add the build's signing fingerprints (`gradlew.bat :app:signingReport`), and download its public Android `google-services.json` to an ignored/private local path. Enable Phone sign-in and app verification. Set Firebase fictional test numbers for the first rehearsal to avoid real SMS charges; use only your own authorized numbers for SMS testing. The pilot uses a debug signing identity and is for sideloaded testing; store-release signing and abuse controls require separate review. [Official Android phone setup](https://firebase.google.com/docs/auth/android/phone-auth).
8. If deploying the optional browser console, register a separate Firebase web app, set its public build config and authorized domain, and rebuild. The browser fake-message inbox is local-only; hosted recipients use Android **Contacts > Inbox**. Private tracking links still need a permitted real delivery channel before unsupervised use.
9. Build the phone APK in the prepared PowerShell terminal:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-hosted-phone.ps1 -ApiBaseUrl 'https://YOUR_API_HOST' -FirebaseConfigPath 'C:\private\google-services.json'
   adb -s HA21GFFM install -r apps/mobile/android/app/build/outputs/apk/pilot/app-pilot.apk
   adb -s ZN5226KC9N install -r apps/mobile/android/app/build/outputs/apk/pilot/app-pilot.apk
   ```

   Pilot is a separate app/account store from Demo. Do not uninstall/clear Demo data. Authenticate both phones against the real project and create/accept a fresh trusted-contact invitation; local emulator accounts/PINs do not migrate. After APK installation, disconnect both cables and turn Wi-Fi off. The API endpoint is embedded at build time; Pilot refuses cleartext traffic and remote endpoint overrides.

## Two-phone acceptance before relying on hosting

Use synthetic/consenting accounts and controlled test alerts only. Keep both apps open: recipient polling is foreground-only. Accept the contact invitation, start manual SOS, observe one recipient entry, tap **I can help**, verify the panel closes and the owner sees CAN_ASSIST, then reopen to confirm saved response without another prompt. Resolve on the owner and confirm recipient access disappears. Repeat with interrupted mobile data and retry; one SOS UUID must not create duplicates. Verify stale/unavailable GPS labels, permission denial and local cancellation.

Test PIN Practice first, same-account OTP step-up for configuration, foreground volume Up/Down/Up/Down within5seconds, and the separate Voice repeated-word opt-in with its10second cancellation window. Those physical tests remain pending for the new build. Do not begin real recordings or trigger SOS remotely from a deployment script. See [polish verification](validation/aegis-polish.md) for software evidence and limits.

## Recovery and remaining release work

Keep encryption keys stable across image rollback; keep the newest ledger and database backups. Roll back code only after confirming schema compatibility; never reset the DB or ledger to make a startup check pass. On migration/start failure leave the prior service running if safe and inspect sanitized logs. Rotate a compromised secret through a reviewed re-encryption process, not by replacing the encryption key blindly.

Public deployment still requires provider/billing approval, runtime identity, real Firebase app configuration, a reachable HTTPS URL, database/storage provisioning and a successful mobile-data rehearsal. Real permitted notification/SMS providers, abuse/load tests, device battery/lifecycle evaluation and production operations remain separate release gates. Hosting files are preparation, not evidence that those gates passed.
