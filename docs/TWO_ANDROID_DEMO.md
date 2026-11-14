# Test the same app on two Android phones

**Current path,14 November2026:** retain the existing server PC and use the [cable-free checklist](USER_CHECKLIST.md) with the [private VPN build](PC_VPN_DEMO.md). The USB setup below is a fallback only. Do not use its APK/install commands for the selected VPN rehearsal.

Both people install **Aegis Demo** (renamed from SurakshaAI). Each account can send alerts and receive alerts; there is no separate receiver APK. The browser at localhost:3000 is optional.

## 1. Keep the PC services running

Open PowerShell in the project folder. Use the local Node version on this PC:

```powershell
$env:PATH=(Resolve-Path .tools).Path+';'+$env:PATH
npm.cmd run doctor
```

Keep PostgreSQL running. Start `npm.cmd run auth:emulator` in one terminal and `npm.cmd run dev` in another **only if they are stopped**. `dev` starts API, worker and the optional browser console. Do not start duplicate copies. For a fresh setup, follow [RUNNING](../RUNNING.md), including migration and seed. No new migration is required for this update. Do not reset the Auth emulator or database during the demo; keep their account identities consistent.

## 2. Install the updated APK on each phone

Enable Developer options → USB debugging on both phones and authorize this PC. This local build needs both phones connected to this same PC by USB throughout the test. It does not connect through the phones' own localhost or a public server. Internet alone cannot replace the USB mapping.

List the phones:

```powershell
& "$env:LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" devices
```

Use each actual device ID from that list:

```powershell
./scripts/phone-test.ps1 -DeviceId PHONE_A_ID -Install
./scripts/phone-test.ps1 -DeviceId PHONE_B_ID -Install
```

Replace the placeholders; do not type them literally. The script installs the same `apps/mobile/android/app/build/outputs/apk/demo/app-demo.apk` and maps API4001/Auth9099 separately on each phone. Repeat the script after reconnecting USB or restarting the PC. This APK embeds JavaScript and models; **Metro is unnecessary**. A new APK is required for this update. If rebuilding it yourself, use the command in [PHONE_TEST](PHONE_TEST.md).

## 3. Sign in with separate numbers

Phone A: your own number. Phone B: your brother's/contact's number, including country code (for India, `+91` followed by the ten-digit number). Use different accounts. Enter the demonstration verification code shown on the PC Auth emulator; this prototype sends **no real OTP SMS**. Set each display name through the top-right menu → Settings → Your name.

For a quick existing-fixture test, Phone A can use `+16505550101` and Phone B `+16505550501`. Those are synthetic demo accounts with an already accepted relationship after a fresh seed. To demonstrate invitation acceptance, use your separate newly created accounts instead. The seeded owner already has five contacts; remove a fictional contact first if adding a new one there.

## 4. Invite and accept entirely in the app

1. On A, Contacts → My contacts → Add a contact. Enter B's name and **the exact number B used to sign in**, plus priority1–5. Save, then Send invitation.
2. On B, Contacts → Inbox. The invitation appears automatically while the app is visible. A banner also opens the inbox from other pages. B may sign in for the first time after the invite was sent.
3. B taps Accept invitation after reading the consent. This lets B receive A's alerts and journeys A chooses to share. **It does not share B's location.** Decline blocks further invitations from A.
4. A's contact updates to Verified automatically. Invitations expire after24hours. If expired, A sends another invitation, subject to the existing rate limit.

## 5. Send, respond and resolve

1. Keep both apps visible and USB connected. On A, Home → SOS. Use only simulated alerts during rehearsal; do not dial112.
2. On B, open the inbox banner or Contacts → Inbox → Open received SOS. Updates run automatically about2seconds **after each completed request batch**. Slow/offline services take longer; there is no delivery-time guarantee.
3. B sees A's shared name and last known location time, if available. View shared location in Maps opens the map app. It does not start tracking B. No location may mean A denied permission or has no fix; SOS still works without GPS.
4. B taps I can help (optional arrival minutes0–240) or I cannot help. On A, the contact response updates automatically in the active alert details. This is a human response, distinct from simulated provider acceptance.
5. A taps I'm safe and confirms resolution. B's location/actions disappear on the next successful check; the server immediately rejects further reads and responses. An offline receiver hides the last displayed position when its detail request fails.
6. Repeat with the roles reversed after B adds A and A accepts. Accepting A's invitation alone does not create a reciprocal relationship.

## 6. Shared journey and consent checks

On A, Journey → choose a destination → Share with verified contacts → Start journey. On B, Inbox → Open shared journey. A marks arrived/ends the journey; B loses access. Resolving a separately escalated SOS is a separate action.

On B, Inbox → Who can send you alerts → Stop receiving from A. This revokes B's existing grants and A sees the changed consent. Receive alerts from A again asks for fresh consent; old links stay revoked. Only future alerts/shares create new access.

Disconnect USB briefly: the inbox should show a connection problem and hide the selected location, then reconnect automatically when the connection returns. Switch accounts: the previous person's invitations and locations must disappear. Test Help/Bachao and motion separately using [PHONE_TEST](PHONE_TEST.md).

## Demo limits

Keep the receiver app open for automatic inbox updates and the in-app banner. Backgrounding pauses polling; returning checks immediately. **There is no closed-app/background push notification service** in this local prototype. Phones still need this PC; production hosting, real OTP/SMS/push and shop onboarding remain future work. Physical behavior on your two phones still needs your test; automated checks cannot certify emergency reliability.
