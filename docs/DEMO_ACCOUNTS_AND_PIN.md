# Names, users, contacts and PINs in the local demo

**Latest,13 November2026:** sender and receiver now use the same Android APK. Open **Contacts > Inbox** to accept invitations, view shared SOS/journeys and respond. The web console is optional. Follow the [two-Android demo steps](TWO_ANDROID_DEMO.md). Foreground updates only; no closed-app push. This supersedes the older browser-receiver instructions below.

The receiver browser is **http://localhost:3000**. Use a separate browser profile/incognito window so the owner and recipient stay signed in independently. The seeded owner is `+16505550101`; contact1 is `+16505550501`. Open Received alerts before sending a simulated SOS. The API uses port4001; that is not the receiver webpage.

## Your name and settings

Open the top-right menu → Settings → Your profile. Enter your name and Save name. Home shows “All well, [first name]?” Phone OTP still identifies the account; the display name is not verified identity. Voice is a bottom tab. More holds motion check-in, PIN, fake call and other extras. Language, data/privacy and sign-out are in Settings.

## Your own users and phone numbers

You can sign in with another correctly formatted international number, including your own, in this local Auth emulator. Request a code, then read it from the PC’s Auth emulator terminal/UI; **no real SMS is sent**. A new account is created when its authenticated profile is first loaded. It starts without the seeded owner’s contacts; set its display name in Settings. Real phone-auth/SMS delivery is not configured.

To add a new recipient:

1. On the owner’s Contacts tab, add their name, international phone number (country code beginning `+`) and priority. There is a five-contact cap; remove an unused fictional fixture first if all slots are occupied.
2. Tap Send invitation. Adding a number alone does not verify it or make it eligible for SOS.
3. In the recipient browser at localhost:3000, sign in with **that exact invited number**, using its emulated code.
4. Open Received alerts, follow the invitation link, and choose **Accept emergency alerts**. Accepting does not share the contact’s GPS.
5. Return to the owner’s Contacts tab and refresh. Check that the contact is Verified, then rehearse a simulated SOS/ACK/resolution.

Keep the existing Auth emulator and database running during rehearsal. Reinstalling the APK or restarting API/worker/web does not require resetting authentication. Arbitrarily resetting the Auth emulator while retaining old database identities can break custom accounts/consents; persistent Auth export/import or a clean fictional demo reset is a separate setup action. Do not publish your phone numbers, verification codes, PINs or private invitation/tracking links.

## What the PINs actually do

These are **in-app shortcuts**, not your Android lock PIN and not a replacement for phone sign-in.

1. In More → App PIN & duress, set two different6–12digit PINs: a normal PIN and a duress PIN. Do not reuse your phone/banking PIN. Setup/reset requires signing in within the last five minutes. If needed, resolve active SOS/journeys, sign out through Settings and sign in again first.
2. Leave **Practice only (no SOS)** on initially. Enter either PIN and rehearse. The app says which screen it **would** open; it does not send SOS or switch into the real decoy flow during practice.
3. For a deliberate simulated duress test, turn Practice off, enter the duress PIN and tap **Use PIN shortcut**. The app opens an ordinary Notes screen and requests one SOS through the existing durable pipeline. A normal PIN instead returns Home. Offline means queued/unknown, not delivered.
4. In Notes, enter the **normal PIN** and tap Open to return to the app. Returning does not resolve the SOS: resolve it separately from Home when safe.
5. Wrong attempts are delayed. Notifications, microphone/location indicators and recipient messages can reveal the alert; this is not guaranteed concealment.

## Testing motion

Open More → Motion check-in with Voice stopped. Enable consent, start, and wait for Ready for shakes. Hold the phone securely and give it three short left–right–left movements within about2seconds. A visible check-in should appear. It does not automatically send SOS. If standard sensitivity misses deliberate shakes, stop, expand Adjust shake sensitivity, enable More responsive, and start again. Keep the app open; backgrounding stops this motion-only session. This heuristic is not validated detection of an attack.
