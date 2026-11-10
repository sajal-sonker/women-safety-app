# 09 — Safe-shop / nearby help network

## Concept from uploaded outline

Local shops, pharmacies and tea stalls can **voluntarily register as assistance points**; the app displays nearby participating establishments, with maps and directions. The outline proposes notifying an open shop to expect an arriving user. This is a *team innovation* and needs an opt-in operational agreement, not an implied government endorsement.

## Roles and eligibility

- `CANDIDATE`: ordinary public POI imported from mapping data, not a participant, cannot receive SOS.
- `APPLIED`: business owner applied, moderation pending, not prominently advertised.
- `ACTIVE`: ownership and consent vetted to defined prototype standards; has hours, contact, emergency preference and visible verification label.
- `PAUSED/REVOKED`: immediately excluded from notification/routing preferences; historical records retained as appropriate.

Only `ACTIVE + opt_in_alerts=true` shops may receive notification, and only under explicitly accepted terms. Shop consent includes expected behavior and right to pause; shop owner may not receive unrestricted user location/history.

## User experience

- Show nearest active shops within a walking radius along legal routes, distance and approximate walking time.
- Distinguish `CONFIRMED_OPEN` (recent owner confirmation), `SCHEDULED_OPEN` (hours suggest open), `UNKNOWN`, `CLOSED`. `SCHEDULED_OPEN` is not guaranteed open.
- Tap to open third-party directions or call public number; always offer 112 in actual emergency.
- If shop alerts enabled, show **user confirmation** or a preconfigured emergency sharing preference before revealing precise location to shop. Do not turn all shops into a neighborhood-wide surveillance network.
- Display `Participating assistance point — help availability not guaranteed`; user should avoid making an unsafe detour purely to reach a listed shop.

## Shop onboarding and moderation

1. Owner provides business name, publicly listed address, public phone, hours, service promises and clear data-sharing consent.
2. Moderator verifies location/ownership using a documented procedure (business-phone call, proof of operation or in-person demonstration in controlled pilot), approves or rejects.
3. Shop can confirm open status, pause alerts, withdraw and report malicious messages; every change audited.
4. Shop SOS recipient receives *minimum necessary* event detail and a bounded route/ETA estimate, not unrestricted evidence.

## Reliability and abuse controls

Rate limit shop alerts per user/event/shop; never automatically expose precise locations to unverified shops; prohibit public user-location maps; authenticate shop responders; prevent contact scraping; log moderation not personal evidence. Shop 'verified' means *verification steps completed*, not professionally accredited safety or a response guarantee.

## Data and evaluation

Sources: verified onboarded shops and OSM candidate POIs (`opening_hours`, `shop`, `amenity`). Count shops by status and hours-confidence, compare OSM hours with manual checks; run stale-hours tests; verify 0 unapproved shops receive emergency alerts. Pilot population should be small and genuinely opted-in; seeded fictional shops must be clearly labelled for demos.
