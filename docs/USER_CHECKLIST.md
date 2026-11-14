# Aegis: final cable-free demo checklist

The **previously configured PC remains the server**. Keep its database, keys, Auth snapshot, Tailscale identity and Android signing identity. Both phones install the same Aegis Demo APK and use separate app accounts. This is a working prototype with fictional shops/routes and emulated OTP/delivery. Paid hosting and real SMS/push are deferred.

## Finish the server update once

On that PC, open the repository on `main` and pull the latest changes. If needed, use its prepared Node26/JDK21/Android SDK terminal. Keep PostgreSQL, Tailscale and the Auth emulator running. Start `npm.cmd run auth:pc` only if Auth is stopped; it imports the existing snapshot. Do not start duplicate listeners or seed/reset accounts.

For this update, stop the old `dev:pc` terminal with Ctrl+C and start `npm.cmd run dev:pc` again so the fixed APK helper loads. Keep Auth in its separate terminal. Then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-private-vpn-phone.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-private-vpn.ps1 -PublishApk
npm.cmd run verify:pc
```

The verified VPN build is published as a fixed copy; a later USB build cannot replace it. If a build, checksum, endpoint or connection check fails, correct that failure before downloading. Detailed setup/recovery: [PC/VPN guide](PC_VPN_DEMO.md). The commands must run on the server, not a fresh development checkout missing its private files. No public Funnel, router port forwarding or cloud migration is needed.

## Install and verify both phones

1. Connect Tailscale on both phones to the server's private network. Open the private APK URL printed by the publish command. Download/update Aegis Demo on both phones without uninstalling or clearing app data. Allow installation from the chosen browser if Android asks. Do not install the old localhost/USB APK.
2. Disconnect USB, turn Wi-Fi off, enable mobile data and keep Tailscale connected. On each phone open the private API origin followed by `/v1/health/ready`; expect status `OK`.
3. Sign in with different phone numbers including country code. Demo OTPs are visible on the server PC at `http://127.0.0.1:4000/auth`; no real SMS arrives. Set each name in Settings. Never reset accounts/PINs to resolve an update/signature error.
4. On A add B as a contact using B's exact signed-in number, send an invitation, and on B open Contacts > Inbox and accept. A should show Verified. Existing synthetic fixture relationships may already be accepted. Receiving consent does not share B's GPS or automatically create the reverse relationship.

## Required end-to-end rehearsal

| Test | Expected result |
|---|---|
| Manual SOS from A | One new alert appears in B's Inbox while both apps are open, even if A has no GPS fix |
| B chooses I can help | Confirmation is saved; response controls close and remain hidden when reopened until Change my response; A sees the response |
| A resolves SOS | B loses location/actions; the active card disappears after the next successful check |
| Shared journey | B sees the deliberately shared journey; A marks arrived and B loses access |
| Network interruption | Clear unavailable/queued state; reconnect retries without creating duplicate SOS; expired/reconfirm-required intent must be handled explicitly |
| Permissions/GPS denied | Useful permission message and unavailable/stale position; no false claim of a fresh fix or confirmed delivery |
| Voice | Start with consent and wait Listening; Help/Bachao shows check-in. For automatic mode explicitly enable repeated words, say five within30s, first cancel during10s countdown and confirm zero alerts, then deliberately allow one controlled alert |
| Motion-only | Stop Voice first; More > Motion check-in > consent > Start > Ready, three deliberate shakes; check-in only. Background stops it; motion never auto-sends SOS |
| Fake call | Start or schedule, Answer/Decline/End; ringing stops and no actual telephone call occurs |
| PIN | Two different6–12digit codes; Practice sends no alert. Inline verification handles recent-auth requirement. Deliberate duress test opens Notes and creates one controlled alert |
| Volume | Explicitly enable the shortcut; Up/Down/Up/Down while Aegis is visible creates one controlled alert. No screen-off/global interception is claimed |
| Account/consent | Sign-out hides previous inbox/name; Stop receiving revokes access. Reverse-role testing needs a separate invitation |

Use only simulated alerts; do not dial112 during rehearsal. For private evidence/export/delete, use the existing consent flows and disposable synthetic accounts for destructive deletion. Broader native/OS test cases are in [PHONE_TEST](PHONE_TEST.md).

## Record the result

Record each phone's model/Android version, which test failed, the exact on-screen error and time. Report failures without OTPs, PINs, recordings or credentials. Physical two-phone/mobile-data, microphone, notification/DND and OEM behavior remain **pending until observed**; builds and automated tests do not establish them.

Keep the server awake, online and connected to Tailscale. The receiver inbox updates only while the app is foreground; closed-app push, real SMS and police dispatch are unavailable in this prototype. On normal server shutdown, let Auth export its snapshot. Neither USB nor Metro is required for the selected VPN build.
