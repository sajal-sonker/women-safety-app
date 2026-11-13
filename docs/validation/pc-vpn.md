# Private PC/VPN demo —13 November2026

User authorized PC services and chose private VPN access over mobile data, replacing the paid-hosting path for this demo. Source baseline main6c132fc. No cloud compute resources/billing were provisioned; existing Supabase/Firebase configuration is retained for future use.

## Configuration implemented

- Tailscale1.104.7 installed using winget; installer hash verified and Windows administrator prompt completed by the user. User completed personal tailnet sign-in and Serve/HTTPS approval.
- Private Serve forwards HTTPS443→127.0.0.1:4001 and TCP9099→127.0.0.1:9099. Public Funnel is disabled. Services remain loopback-bound. The Auth emulator is reachable only by the user's enrolled tailnet devices, not a public endpoint.
- New profile guard and PC commands load ignored `.local/pc.env` explicitly, refuse remote DB/public listener/real-project emulator combinations and remove inherited server cloud credentials. Real Supabase settings in root.env remain unchanged; its saved private connection and certificate remain excluded. Existing local PostgreSQL database/keys/accounts were reused, not reset.12 already-applied migrations were observed; no new application migration was needed.
- API/worker/web were restarted under the private PC profile; the Auth process was retained. Auth export was saved privately, and `auth:pc` now supports import/export-on-normal-exit for later restarts.
- New Demo APK uses the PC's stable private HTTPS endpoint and the existing demo Firebase project. Internal com.surakshaai.demo app ID/signer/key aliases remain unchanged. No new mobile/native application feature code or HTTP contract change was required.
- Windows rejected direct Tailscale path serving for this non-admin user. APK sharing instead uses a loopback-only helper on4002, proxied through private HTTPS8443. Only the fixed APK route supports GET/HEAD; other paths, traversal and writes fail. No repository directory, credentials or emulator exports are shared.
- Reusable scripts and setup/recovery instructions are in [PC_VPN_DEMO.md](../PC_VPN_DEMO.md). Actual hostnames/peer data and all secrets remain in ignored local configuration.

## Executed verification

- `npm run test:pc`: final complete suite43 passed,0 failed,3.7s. The isolated local test DB was used, not Supabase or application data. Includes the two profile guards and two download tests: MIME/HEAD/no-store, exact-route serving, traversal/private-file denial, write denial and missing-file503. `npm run lint` passes.
- `npm run doctor:pc`: profile valid, local DB reachable, Auth/API/web listening. Fresh API/worker/web startup under this profile succeeded.
- Private HTTPS `/v1/health/ready`:200 from the PC using the VPN address with normal certificate verification. Auth emulator config endpoint through private TCP9099:200. APK download HEAD through private HTTPS8443:200.
- Full163080507byte download through the private HTTPS URL was streamed and SHA256-matched to the local APK. Typecheck, lint, deterministic contract generation and documentation-link checks pass. This is PC-side verification, not a phone/mobile-data result.
- Tailscale Serve JSON confirms443/9099/8443 handlers and no public Funnel. One Android peer was online at the initial check. Peer connectivity is not evidence of app installation or mobile-data SOS behavior.
- `assembleDemo` with private HTTPS apiBaseUrl: successful in1m1s. Bundled JS/YAMNet/28 speech asset hashes/licences and18 native ELF16KB alignment pass; APK v2 signature and ZIP16KB alignment pass. Aegis Demo label confirmed. SHA256 **13a1fb671443dece6272e2b103a53338ad5327cdbe94e5ec9ca0f4dbe9f85c29**,163080507bytes. Previous USB APK was retained privately for recovery. No physical16KB runtime certification.

## Pending device acceptance and limits

User has the private APK link and was asked to install/update both phones, turn off Wi-Fi, keep Tailscale connected over mobile data, check API health and open Aegis. No adb phones were connected; physical app installation/mobile-data success has not yet been confirmed. Do not claim otherwise. Follow the two-phone manual SOS/ACK/resolution/permissions/retry/PIN/volume/Voice checks in the guide. No test here initiated an SOS, microphone recording, real SMS/push or emergency call on a phone.

User explicitly deferred physical testing until tomorrow and requested pushing the completed setup now. Physical acceptance remains PENDING, not failed or passed.

PC sleep/shutdown, VPN disconnect or stopped services interrupts remote access. Demo OTP remains on the PC, fake delivery and fictional Lucknow map data remain explicit, and recipient updates are foreground-only. This is a controlled private demonstration rather than a publicly deployed emergency service. Real Firebase/Supabase authentication, runtime roles/schema isolation, real providers, public-host operations and independent device/model/reliability gates remain separate work.
