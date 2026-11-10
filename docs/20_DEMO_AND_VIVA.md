# 20 — Demo script, presentation framing and viva defense

## Core project pitch (30 seconds)

> SurakshaAI is an Android-first safety assistant integrating three functions: time-aware route condition indicators, rapid private SOS notification to preconfigured trusted contacts, and optional discreet controls. Audio distress detection remains a gated research experiment. It also helps users locate opted-in assistance shops and gives contacts a secure web view of live-location freshness and response status. It does not claim to guarantee safety or dispatch police automatically.

## End-to-end demo (all accounts and places synthetic/consented)

1. **Setup:** test login, add four test trusted contacts, invite one contact to temporarily share location (other contacts have no GPS). Prove candidate pool includes only configured contacts.
2. **Prevention:** same source/destination at 16:00 vs 23:00; choose three walkable alternatives, compare route ETA, evidence-backed condition score, confidence, explanations and unknown fields. Show missing-data warning deliberately.
3. **Safe journey:** begin journey with ETA; demonstrate on-time arrival and a separate test fixture for overdue check-in leading to server-generated SOS.
4. **Response:** tap manual SOS once; show worker queued vs accepted statuses, browser SMS link, dynamic position with last-update timestamp and contact acknowledgement. Show nearest *eligible* contact ranking then other-contact fallback.
5. **Assistance:** show opted-in shop status/hours and direction, explaining the difference between scheduled and confirmed open; no invented real responder.
6. **Discretion:** use fake call, then separately enter duress PIN on a disposable test account; the app shows decoy UI while a test SMS is generated. Demonstrate a known OS/background limitation in the volume-key prototype rather than concealing it.
7. **Experimental status:** show the foreground motion check-in and disabled audio AI. Run the dataset integrity checker; absent data/model returns BLOCKED_EXTERNAL. Do not present a fake model score, battery number or accuracy metric.
8. **Security:** resolve event; recipient tracking link is revoked; prove unauthenticated ID guessing is rejected. Show log redaction and location deletion policy.

## Viva Q&A (short defensible answers)

**Q: How is your app different from ordinary SOS apps?**  
A: Integration of route context and uncertainty, consented nearby contacts/shops, and situational on-device ML with the emergency response flow. We demonstrate our features rather than assuming competitors lack them.

**Q: What is time aware, exactly?**  
A: Each road edge is scored at its expected traversal time; sunset, opening hours and verified reports can change its context. One hard-coded 11 PM penalty would not count as evidence-based time awareness.

**Q: Is score 80 equal to 80% safe?**  
A: No. It is an explainable relative proxy indicator from measured/assumed road factors with a separate confidence value, not a probability of an attack.

**Q: Where does the crime data come from?**  
A: We do not assume granular crime ground truth. Moderated condition reports and OSM-derived features are proxies; we document bias, sparse reports and missing fields.

**Q: Why not send SOS to any nearby person?**  
A: It creates privacy and misuse risks. We prioritize only the user's preselected trusted contacts and require explicit consent before accessing contact GPS.

**Q: What if the nearest contact has not consented to share their location?**  
A: We cannot determine their current distance. Use other fresh opted-in contacts or the user's configured priority order, and never infer GPS from phone numbers.

**Q: Can volume buttons work while locked or app killed?**  
A: Standard Android key events are foreground-focused. We test target devices and offer system-supported notification/tile shortcuts; we don't claim universal interception.

**Q: Is recording 24/7?**  
A: No. Monitoring is explicitly started as a session. Inference is local. Android imposes foreground-service restrictions, and consented evidence capture is a separate action.

**Q: What if internet is down?**  
A: A server SMS gateway cannot function without the device reaching the server. We show `not sent`, queue for later retry and allow the native 112 call; no fake offline success.

**Q: Did the professor give you all these features?**  
A: The professor asked for stronger differentiation and time-aware route scoring, later suggested Fake PIN and an optional low-battery broadcast; we chose to skip the latter. The sensor-fusion, contextual SOS, shop-network and route-factor ideas are our team's design choices.

**Q: How do you prove ML helps?**  
A: Compare audio-only, motion-only, AND and fused decisions on held-out staged data and report false alarm rates, missed detections, battery draw and device/platform limits.

## Claims to avoid

- 'Guaranteed safe route', 'Detects violence with certainty', 'Always works on a locked phone', 'Automatically alerts police', 'All nearby shops are safe', 'Works offline via SMS' unless directly validated with required privileges/connectivity. Use measured, scoped descriptions instead.

For the current implemented demo and missing gates use [Phase3](validation/phase-3.md) and [Phase4](validation/phase-4.md). Demonstrate optional evidence quarantine/revocation and private export separately from the initial SOS. All places/accounts are synthetic; no official emergency call is made.
