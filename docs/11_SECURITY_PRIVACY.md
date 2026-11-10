# 11 — Security, privacy, abuse prevention and threat model

**Sensitivity:** The system may expose a user's live location, emergency status, contacts, audio and images. Wrongful disclosure can increase danger. Therefore **access control is a functional requirement**, not an afterthought. Review applicable Indian data-protection, telecom, emergency-alert and local recording rules with qualified guidance before real-world deployment; this specification does not assert legal compliance.

## Assets and adversaries

Assets: live/archived GPS, contact numbers, contact voluntary GPS, journey destination (potential home address), duress PIN, tracking grants, recordings/photos, safe-shop owner data, incident reports, provider secrets. Threats: stalkers, abusive partners/family members, coercers with unlocked phone, a fraudulent 'trusted contact', phishers with SMS link, compromised shop account, malicious crowd reports, malicious admins, provider leaks, stolen phone and infrastructure compromise.

## Security control matrix

| Threat | Mitigation | Verification |
|---|---|---|
| Enumeration of SOS IDs | opaque UUIDs AND per-resource authorization | guess other IDs → 403/404 |
| SMS link leaked/forwarded | 128+ bits random grant; hashed at rest, limited event scope, short TTL, revoke on resolve; exchange to secure cookie; referrer and cache restrictions | replay and expired-link tests |
| Contact used to stalk owner | verified invitation, informed consent, only SOS/journey-bounded sharing, revoke and blocking functions | contact cannot view historic or inactive GPS |
| Contact location tracked without consent | separate location-sharing session per contact, explicit UI and expiry, revoke | no ranking without recent consented GPS |
| Coercer sees Fake PIN | disclaim hidden limitations, suppress in-app confirmation, configurable notification visibility, normal PIN separate | walkthrough with physical observer |
| Abuse of shop network | verify shop owner/consent; moderator approvals; minimal location exposure; rate limits; shop pause | unverified shop never receives event |
| Incident false reports/brigading | moderation, report expiry, IP/user/device rate limits, provenance and anomaly checks | sybil/repeated-report tests |
| Evidence exfiltration | private encrypted object storage, signed upload, scoped streaming, no public ACL, access log, short retention, delete path | anonymous URL denial; storage policy scan |
| Privileged admin misuse | roles `USER`, `CONTACT`, `SHOP_OWNER`, `MODERATOR`, `SUPPORT`; least privilege and audited break-glass only if approved | privilege escalation tests |
| Token/key leak | server-only secrets, secrets manager, key rotation, redact logs, mobile token secure storage | secret scanning and rotation drill |
| Replay/duplicate SOS | authenticated idempotency key and server transaction unique constraint | two parallel retries → one event |
| Fake delivery acknowledgement | distinct provider acceptance vs delivered vs recipient acknowledged | fault-injection adapter checks |
| Silent recording | visible monitoring state, clear opt-in, OS indicators, no ambient media upload by default | revocation and session termination tests |

## Data minimization and consent

- **Default OFF**: mic/accelerometer inference, continuous GPS, evidence capture, optional contact location, shop alerts and community reports. SOS itself may transmit location after one conscious activation; explain consent at onboarding and at action.
- Phone OTP confirms control of a number, **not identity, age, safety or trustworthiness**. Allow contact revocation, block unwanted invitations and opt out from future app messages where lawful.
- Never send raw photos/audio by SMS or expose unprotected CDN links; send secured browser links whose scopes are checked server-side.
- Do not expose recipient location to the SOS user unless recipient explicitly chose to share it; need-to-know only.
- Crop/blur geolocation in public incident reports and remove names, exact household coordinates, images of identifiable persons and home addresses in public map outputs.
- Location histories can reveal intimate patterns; keep only recent points needed for active monitoring and demonstrable post-event summary.

## Proposed retention schedule (requires policy approval)

| Data | Proposed default | Reason |
|---|---|---|
| Live SOS trace | active event + 24 hours, then purge detailed trail | bounded crisis use |
| SOS summary/history | up to 30 days, user deletion supported | personal event history |
| Audio/photo evidence | up to 7 days unless user explicitly preserves | minimize highly sensitive media |
| Contact shared GPS | rolling latest fix only, purge at session end/expiry | distance rank only |
| Raw unverified reports | 30 days pending then remove/aggregate | prevent persistent accusations |
| Approved aggregated report features | expire/decay on documented schedule | prevent historical false certainty |
| Access/audit metadata | short limited window (e.g. 90 days), no raw GPS/media | abuse investigation |

These are **draft product defaults**, not laws. Document actual production retention, deletion implementation and provider residual copies; handle account deletion without causing broken active alerts.

Review-1.2 adopts these as local/staging engineering defaults, with live policy approval still external. Events expire hard24h, so abandoned sharing cannot persist indefinitely. Journey trace follows terminal+24h; personal route queries/geometry24h; exports24h; backups30d with restore-time erasure ledger. Purge every copy, including initial event coordinates, context labels, destinations and raw request bodies; a summarized event retains no detailed location. Idempotency records store hash/resource reference, not a second coordinate archive. Immediate revoke is independent of later purge. Exact gates are in [TESTING_AND_ACCEPTANCE_GATES.md](TESTING_AND_ACCEPTANCE_GATES.md).

## Secure implementation requirements

- TLS/HSTS; CORS limited to known origins; CSRF defense for cookie APIs; secure/HttpOnly/SameSite cookies; no sensitive response caching; `Referrer-Policy: no-referrer`; `X-Robots-Tag: noindex` on tracking.
- Validate E.164 phone, URLs, timestamps, geographic bounds, polygon geometry, file size/MIME, content type, provider signature. Reject overlarge payloads and old/out-of-order GPS points.
- Use database transactions for event+outbox; separate worker credentials from API; read-only route importer; separate moderator and public access policies.
- Keep privacy-oriented logging: request ID, event UUID, provider receipt state, latency and error category; never log number, precise location, tracking token, media bytes or duress PIN.
- Run dependency scanning, secret scanning, SQL injection/XSS/CSRF/IDOR reviews, reverse-proxy security headers, backup/restore and incident response drill.
- Publish plain-language disclosure of permissions, emergency limitations, contact/shops consent, false alarms, and user data deletion.

## Safety-by-design red-team cases

1. Partner gets a screenshot of a tracking URL; can they view someone after resolution? **No.**
2. Someone creates 100 fake harassment reports to stigmatize a street. **Should not automatically affect trusted score before moderation/corroboration.**
3. Shop owner claims to be verified and seeks victim locations. **No access before approval/consent.**
4. Device offline after duress PIN. **Do not falsely claim SOS delivered.**
5. Emergency contact withdraws location-sharing permission. **Remove contact GPS and re-rank without stalking.**
6. Media upload fails. **Dispatch unchanged; do not retry unconsented recordings.**
7. User requests help on an area with missing data. **Show insufficient evidence; do not label route safe.**
