# 16 — Geospatial, assistance and ML data sources & quality protocol

## Principle

A convincing model is not simply a formula. Each route feature must come from an identifiable source with time coverage, geographic coverage, uncertainty, license and update method. Do not create 'actual harassment hotspot' claims from unsourced mock points.

## Candidate geospatial sources

| Layer | Candidate source | Processing | Critical limitation |
|---|---|---|---|
| Walkable roads/crossings | OpenStreetMap (OSM) regional extract | clip pilot boundary; build graph; walk-access validation | missing sidewalks/closures and incomplete coverage |
| Street lighting | OSM `lit=*`; optional survey/municipal open data with permission | spatial road join and source date | missing tag ≠ no streetlight; some lamps broken |
| Shops/public POIs | OSM shop/amenity/opening hours; direct opted-in shop data | distinguish candidates vs approved shops | hours not always true; don't infer opt-in from OSM |
| Police/hospitals | OSM + verified public directories | deduplicate and check contact/accessibility | proximity does not guarantee response |
| Solar darkness | astronomical sunrise/sunset for local coordinates/date | solar calculation per journey/edge | no direct measure of artificial lighting |
| Incident/conditions reports | in-app reports subject to moderation and recency | categories, privacy-safe aggregation, weighting | selection bias, brigading, false reports |
| Road surface/access | OSM pedestrian access, crossings, surface tags | hard constraints before risk ranking | road accessibility not always current |
| Human activity | only consented/sourced aggregate if obtainable | coarse, auditable proxies | no covert phone tracking or demographic inference |

## Initial pilot and research method

1. Choose a **bounded city/region after inspection**; user outline mentions Lucknow as a comparison but does **not** definitively select the pilot city. Put chosen boundaries in an ADR with OSM extract date.
2. Inventory known/unknown tags by segment length and ward/neighborhood *without* equating missingness with low risk.
3. Manually audit a *small permitted sample* for lighting, shops and opening hours; record observation date/time, not personally identifying bystanders.
4. Develop scoring rules using these features and publish sensitivity/coverage diagnostics.
5. Use synthetic reports for functional tests; visually mark them as synthetic in demos; real crowd reports only after safeguards/moderation.
6. Provide data dictionary, source URL, license/attribution (including OSM/ODbL obligations as applicable), acquisition date, update schedule and missingness table.

## Example input mapping

- `lit=yes`: evidence street is tagged lit, but no guarantee lights operational; after sunset reduce lighting-risk proxy conditional on confidence.
- `lit=no`: tagged unlit, verify where possible; at daytime the lighting factor should have different impact than night.
- `lit` absent: **UNKNOWN** with reduced factor coverage, not `no`.
- `opening_hours=...`: evaluate at segment expected arrival, not starting time; label scheduled vs confirmed status.
- `amenity=police`: candidate help POI, verify public accessibility, don't turn distance into guaranteed response ETA.

## Audio and motion dataset protocol

Only informed-consent staged recordings and permissioned public datasets. Track dataset license, language (Hindi/English), speaker identity split by pseudonym, noise environment, device and capture conditions. Don't publish raw identifiable audio by default. Create negative cases: playing sports, cheering, television dialogue, traffic, running, potholes and phone drops. Document imbalance and generalization limitations.

## Competitor/statistical context

The attached outline's statements about bSafe, Himmat Plus and Safetipin are a starting research list, not authoritative ground truth. Verify current feature/paywall/platform/location claims from latest official product pages before a final presentation. Crime statistics, if used, must be linked to a dated official source and not treated as segment-level labels for road scoring without adequate spatial/temporal resolution.
