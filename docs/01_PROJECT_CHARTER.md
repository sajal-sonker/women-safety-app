# 01 — Project charter

## Purpose

Provide a quick, accessible way for a person who feels unsafe to alert their chosen trusted contacts, communicate a changing location, identify nearby opt-in assistance points, and make better-informed route choices. The product is **women-focused but does not exclude users by gender**. It is a university engineering project, not an operational guarantee of emergency response.

## Problem statement

Traditional SOS experiences depend on explicit taps, are often limited to a coordinate-only alert, and may not help users choose routes with contextual information. The team will explore combining fast escalation, context, explainable time-aware navigation and consent-based local help into one workflow.

## Innovation pillars

1. **Prevention:** compare alternate walking routes with a time-aware *relative estimated risk score*, explain data gaps, and display nearby registered help points.
2. **Detection:** optional session-based on-device distress inference from screams/distress words and abrupt movement; defaults off; manual controls always available.
3. **Response:** contact selection within a user-defined trusted group, live tracking without receiver app installation, optional context evidence, route/ETA to assist, durable delivery and escalation.
4. **Discretion:** fake incoming call, discreet/duress PIN mode, feasibility-gated hardware-key trigger.

## Stakeholders

- Primary: user configuring their own safety preferences and trusted contacts.
- Trusted responders: invited contacts who explicitly agree to receive alerts and may separately volunteer their own live location during designated periods.
- Shop owners: opted-in, vetted participants capable of offering a public assistance point, **not** emergency professionals.
- Moderators/admins: limited privileges to verify shops and moderate incident reports, without default access to emergency media.
- Faculty evaluators: judge implementation, evidence, methods, limitations and fairness.

## Boundaries

**Initial release:** Android 10+ pilot on a small geographically defined India region, English/Hindi labels, mobile app + web responder page + web moderation, simulated provider accounts and controlled test contacts. Android API coverage is a testing target, not a guarantee across vendors.

**Not in committed scope:** low-battery auto-location broadcast; OS-level replacement emergency calls; direct 112/ police CAD integration; always-on microphone; tracking arbitrary contacts; automatic recording outside clearly consented contexts; official certification of any 'safe' place; iOS parity; public community-wide SOS broadcasts; crime-probability claims.

## Success criteria (prototype targets, not achieved results)

- A test user can configure 3–5 trusted contacts and send an SOS manually in one intentional action after setup.
- Server saves the SOS and enqueues initial contact notifications without waiting for media enrichment.
- A non-app recipient with an authorized link sees current or *explicitly stale* location, not an unlabelled last-known pin.
- Three route variants can be demonstrated at different times; confidence, uncertainty and reason codes are displayed.
- A safe-journey overdue case triggers the same tested SOS/escalation pipeline after a short check-in grace policy.
- AI and stealth features only graduate from experimental if real-device acceptance criteria are met; otherwise clearly shown as prototype-only.

## Safety principles

Fail visibly and safely; never manufacture delivery success or location freshness. Users control monitoring and sharing. Privacy and opt-in govern contacts, shops, evidence, reports and alerts. Favor official emergency call access over speculative automated dispatch. Design for coercion/abuse scenarios and screen readers, not only happy-path demos.

## Attribution and source limitations

The attached source outline names bSafe, Himmat Plus and Safetipin and lists perceived weaknesses. These are **team-supplied statements pending competitor verification**. Faculty's input on differentiating the app, time-aware scoring and the newest Fake PIN/optional low-battery proposal must not be conflated with the team's original features.
