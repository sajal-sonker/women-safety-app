# 02 — Product requirements document (PRD)

## Priority legend and acceptance language

- **P0 / committed:** required for a believable functional core; failing blocks release/demo acceptance.
- **P1 / committed after P0:** planned in the four-phase execution, assuming data/service feasibility.
- **EXPERIMENTAL:** investigate, implement under feature flag, ship only if validated; fallback is defined.
- **OUT:** explicitly excluded or unsupported.
- Every requirement has an ID, measurable user outcome and error behavior; details live in linked technical documents.

## User stories and functional acceptance

| ID | Priority | Requirement | Minimum acceptance condition |
|---|---|---|---|
| AUTH-01 | P0 | Phone + OTP login; authenticated session | Real auth provider verified on backend; expired tokens rejected; test numbers separate from production |
| CONT-01 | P0 | Add/edit/remove 3–5 emergency contacts | E.164 validation; no hardcoded numbers; contact consent/invite status displayed |
| CONT-02 | P1 | Closest consenting eligible contact | Only if explicit, recent contact location exists; correct geodesic rank; otherwise deterministic priority fallback |
| SOS-01 | P0 | Single-action prominent SOS | SOS created with latest available location and device timestamp; response clearly indicates queued vs delivered |
| SOS-02 | P0 | Server-side durable notification fanout | Idempotent create; persistent dispatch outbox; SMS/push adapters report queued/sent/delivered/failed distinctly |
| SOS-03 | P0 | Share a live tracking link to verified contacts without requiring app install | Limited-scope expiring link, revocable on event resolution; browser refresh/push updates and freshness indicator |
| SOS-04 | P0 | SOS history | Authorized owner sees time, trigger and status; no other user's data |
| SOS-05 | P1 | Alert context enrichment | Available battery, location age, motion/travel estimate and optional landmark; enrichment never blocks initial SOS |
| SOS-06 | P1 / gated | Optional 10-sec audio and user-consented photo/video evidence | Only when OS permissions/foreground lifecycle allow; no recording claimed if capture fails; encrypted short retention |
| SOS-07 | P0 | Contact escalation and acknowledgement | Primary prioritized; if unacknowledged, other trusted contacts notified/escalated per documented policy; status auditable |
| CALL-01 | P0 | Direct official emergency call shortcut | Tap initiates system call intent to 112 (no claim of silent police dispatch) |
| JOUR-01 | P1 | Start journey with destination and ETA | User can mark arrived; server schedules overdue evaluation; notifications only after check-in policy |
| JOUR-02 | P1 | Tracking is bounded by active journey or SOS | Stops on arrival/expiry/explicit stop; battery-aware update strategy; freshness visible |
| ROUTE-01 | P1 | Time-aware alternate routes | Calculates at expected traversal time, not only starting time; compares travel time, score, confidence |
| ROUTE-02 | P1 | Explainable score | Exposes primary contributing factors, data provenance, missing coverage; never calls score a danger probability |
| ROUTE-03 | P1 | Route choice | Fastest, balanced and lower estimated-risk alternatives; users may choose route; material detour disclosed |
| REPORT-01 | P1 | Report relevant road conditions/incidents | Rate-limit, geofence/report schema; status `pending` until moderation; no public reporter identity |
| REPORT-02 | P1 | Moderation and freshness | Staff approve/reject/remove; old reports decay; abuse and brigading checks |
| SHOP-01 | P1 | Discover registered assistance shops | Proximity, claimed/open-hours status, verified/unknown labels, call/directions; never guarantee a shop is open |
| SHOP-02 | P1 | Shop signup, verification and opt-in | Shop owner opts in, verified by moderator; can pause/close; public display only with consent |
| SHOP-03 | P1 / conditional | Notify a consenting shop during SOS | Only designated opted-in shops with explicit operational agreement, rate limits and safe defaults |
| FAKE-01 | P1 | Scheduled fake incoming call | Clearly in-app simulated call, dismissible, no actual telephony impersonation |
| PIN-01 | P1 | Fake PIN / duress PIN | Separate from normal PIN; fake PIN enters innocuous decoy area and securely requests SOS if online; user warned about notification/OS limits |
| KEY-01 | EXPERIMENTAL | Silent volume-key code | Validated initially while app focused; background/screen-off not claimed unless tested, lawful and permitted on target OS |
| MOT-01 | EXPERIMENTAL | Shake/abrupt-motion trigger | Limited to active permitted monitoring; false-positive safeguards, configurable sensitivity |
| ML-01 | EXPERIMENTAL | On-device scream/distress classifier (Hindi/English pilot) | Offline inference; consented monitoring session; measured metrics and failure modes |
| ML-02 | EXPERIMENTAL | Multisensor decision | Calibrated fusion and cancel/check-in pathway; no rule requiring both signals for every emergency |
| ADMIN-01 | P1 | Moderate shop and incident records | Role-based scoped access; action audit; no automatic access to SOS evidence |
| OFF-01 | OUT | Low-battery automatic location broadcast | Explicitly skipped by team following professor feedback |
| IOS-01 | OUT for v1 | iOS parity | Future feasibility after Android proof |

## Primary journeys

**Onboarding:** install → consent & permissions explanation → OTP → add emergency contacts → invite/verify → optionally set duress PIN → test an alert in DEMO MODE → ready. Permissions requested contextually, not all at install.

**Manual SOS:** user taps SOS → device acquires latest available location without waiting indefinitely → API creates event + notification outbox → recipients get SMS/push tracking link → location stream continues while permitted → optional evidence appended → acknowledgements and escalation → user resolves → links expire/revoke.

**Auto SOS:** user deliberately starts monitoring → audio/motion model evaluates on device → probable high-risk event → discreet alert confirmation/cancel window *if safe* → normal SOS pipeline. If capture permissions unavailable, UI says monitoring degraded; manual SOS unaffected.

**Safe journey:** choose start/destination + ETA → compare routes → activate journey monitoring → contact visibility per preference → mark arrived; if late, server sends check-in then escalates; offline stale data is explicit.

**Duress PIN:** a separately chosen, non-obvious PIN in the app → innocuous decoy screen while queued SOS runs → do not display celebratory success, expose notifications, or imply guaranteed concealment.

## Non-functional requirements and measurable tests

- **Availability:** retryable server actions; persistent outbox; no guarantee across complete network outage. Test idempotent duplicate sends, provider failures and process restarts.
- **Latency:** prototype target manual SOS local UI reaction <1s; server persistence + queued dispatch p95 <3s in staging; external SMS delivery timing measured separately, not promised.
- **Freshness:** during active SOS attempt location updates every ~10–20s or significant displacement when permissions/network permit; use event timestamps and freshness labels. Never present an old position as current.
- **Battery:** no continuous mic, motion or GPS outside deliberate safety sessions; record energy use with and without monitoring; configurable refresh interval.
- **Security:** TLS; auth; least privilege; no raw GPS/media in logs; revocable expiring tokens; encryption; access audit; deletion controls.
- **Accessibility:** minimum one-tap SOS after setup, strong contrast, large tap targets, TalkBack labels, Hindi/English text; fake PIN not required for basic use.
- **Locality:** pilot region configurable; local emergency helplines validated by region; 112 available as nationwide emergency call option.

## Acceptance gating

P0 releases if AUTH-01, CONT-01, SOS-01/02/03/04/07 and CALL-01 pass. P1 routing/shop features can display 'insufficient data' rather than fabricated certainty. Experimental features are separately demonstrated with explicit limitations and cannot be used as sole emergency mechanism.

## Key exclusions and dependencies

No 24/7 secret recording, crowd-wide SOS broadcast, police-dispatch integration or optional low-battery broadcasts. Contact locations require consent/active sharing; shop 'open now' requires credible current evidence; camera capture is never assumed available while app is backgrounded. See `03_ARCHITECTURE`, `10_STEALTH_AND_DURESS`, `11_SECURITY_PRIVACY`, and `17_DECISIONS_AND_OPEN_QUESTIONS`.
