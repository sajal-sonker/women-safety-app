# Aegis over mobile data using the PC

The user selected a free private VPN for cable-free testing. The PC runs PostgreSQL/PostGIS, API, worker and demo phone authentication. Both phones run Tailscale and Aegis Demo. The PC must remain awake, online and connected to Tailscale. No paid cloud server, Supabase connection or real Firebase SMS is needed for this mode. Supabase and the real Firebase Pilot app remain separate future deployment work.

Tailscale still provides its VPN coordination/relay service; the application backend and data remain on this PC. Its Personal plan supports non-commercial personal use; check [current eligibility](https://tailscale.com/docs/account/manage-plans/free-plans-discounts). This is a private prototype. Maps/shops and delivery providers remain fictional/fake, and recipient updates require the app to be open.

## Private configuration and startup

Use ignored `.local/pc.env`, created from [.env.pc.example](../.env.pc.example). Keep the original local DB password, encryption key and receipt secret when retaining existing records. Do not regenerate encryption keys or reset the database. Root `.env` can retain Supabase settings: the commands below explicitly load the PC profile and refuse a remote database, non-loopback listener or real Firebase project. All credentials and emulator exports stay ignored.

In the prepared project terminal, verify:

```powershell
npm.cmd run doctor:pc
```

When restarting the demo, PostgreSQL must already be running. Use two terminals:

```powershell
npm.cmd run auth:pc
```

```powershell
npm.cmd run dev:pc
```

Keep both open. These commands refuse duplicate listeners. `auth:pc` imports the latest `.local/auth-emulator` snapshot if present and exports on normal Ctrl+C shutdown. Before closing an older/non-persistent Auth terminal, save its current state with `npm.cmd run auth:snapshot:pc`. An abrupt power loss or forced termination can prevent shutdown export; preserve the most recent snapshot and DB together. Do not seed/reset the app to repair an identity mismatch.

`npm.cmd run db:migrate:pc` checks/applies existing checksum-locked migrations against the local profile only; it does not seed accounts. `npm.cmd run test:pc` uses the same profile to run tests in the isolated local test database, not the application's data. Root `npm run dev`/`npm test` use the ordinary environment and are not substitutes when root `.env` points to Supabase.

## Configure the private VPN once

1. Install Tailscale on the PC and both Android phones. Sign all three into the same personal tailnet and connect. The phones' Aegis accounts should still be different. Complete any Windows installer and Android VPN permission prompts locally.
2. Run:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-private-vpn.ps1
   ```

3. If Tailscale asks, enable Serve/HTTPS using its owner approval page. Keep public Funnel disabled. The script configures only private Serve: HTTPS443 → local API4001, TCP9099 → local Auth9099. Services continue binding127.0.0.1; no router port forwarding or public firewall rule is required. Existing conflicting Serve handlers are refused rather than overwritten. See [Serve documentation](https://tailscale.com/docs/reference/tailscale-cli/serve).
4. The private API address is saved in ignored `.local/vpn.json`. No actual PC hostname, tailnet identity or credential belongs in versioned configuration.

## Build, download and install without USB

Build with Node/JDK21/Android SDK configured in the project terminal:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-private-vpn-phone.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-private-vpn.ps1 -PublishApk
```

The second command proxies HTTPS8443 to the single-file APK helper on127.0.0.1:4002, started by `dev:pc`. This works without Windows administrator file-serving privileges. It shares only `/aegis-demo.apk`; other paths and directory traversal are refused. Open the printed URL in each phone's browser while Tailscale is connected, download the APK, and approve installation/update of **Aegis Demo**. The APK is about163MB; downloading over Wi-Fi first avoids unnecessary mobile-data usage. Android may ask you to allow APK installation from that browser. Do not uninstall or clear the existing app's data. Same PC signing identity is required to update an existing installation; a signature mismatch needs recovery review rather than wiping PINs/accounts.

This APK embeds the private PC endpoint. The old USB/localhost APK needs updating on both phones. Do not run `scripts/phone-test.ps1` to test VPN connectivity: that helper installs/maps the USB flow. After installation no USB cables, Metro or Android debugging are needed. Keep Tailscale connected whenever using this build.

The same `com.surakshaai.demo` app identity and demo Firebase project preserve existing local users and encrypted data. No real Firebase/Supabase account migration occurs. APKs built on another machine can use a different debug signer: transfer the authorized signing material privately or agree a separate installation strategy, never commit a signing key.

## OTP and two-phone rehearsal

1. Turn Wi-Fi off on both phones, enable mobile data and connect Tailscale. On each phone open the private API address plus `/v1/health/ready` in its browser; expect status OK. This tests the actual mobile-data path.
2. Open Aegis Demo. Request a verification code for the intended local account. On the PC, find its code at `http://127.0.0.1:4000/auth` or `http://127.0.0.1:9099/emulator/v1/projects/demo-surakshaai/verificationCodes`. No SMS is sent. Don't share that JSON or expose the emulator publicly.
3. Use different owner and recipient accounts. Existing fixture owner/contact accounts remain available if their Auth snapshot was retained. For personal numbers, invite the recipient and accept in **Contacts > Inbox**; matching phone numbers alone do not grant consent.
4. Keep both apps open. Start a controlled manual SOS on the owner. Verify one received alert on the other phone, tap **I can help**, confirm the panel closes with saved status, and verify the owner sees the response. Reopen details: response actions stay hidden until Change my response. Resolve on the owner and verify recipient access ends.
5. Rehearse Practice PIN first; then deliberately test volume Up/Down/Up/Down with the app visible and the separate Voice repeated-word opt-in/countdown cancellation. No remote script starts microphones or sends these alerts for you. Repeat a manual SOS after a temporary mobile-data interruption and check one event rather than duplicates.

A disconnected VPN, sleeping/offline PC or stopped server makes the remote backend unavailable. Local SOS journaling retains its existing bounded retry/reconfirm behavior; opening the112 dialer remains a separate user action. This setup does not supply closed-app push, real SMS or police dispatch.

## Recovery and scope

Retain `.local/pc.env`, Auth export and local PostgreSQL data privately. Keep root `.env` and `.local/supabase.env` separate. Do not disable TLS verification, publish the emulator with Funnel, or bind local demo services to0.0.0.0 to solve VPN errors. Check Tailscale connection, private Serve status, the PC profile and server health first. A `.ts.net` hostname change requires rebuilding/reinstalling the APK; ordinary mobile-data/IP changes do not.

Stop only the app's Serve handlers when no longer needed: `tailscale serve --https=443 off`, `tailscale serve --tcp=9099 off`, and `tailscale serve --https=8443 off`. Avoid resetting unrelated Serve configuration. Use the account admin console to remove lost devices. See [current validation](validation/pc-vpn.md) for executed checks versus pending physical-phone tests.
