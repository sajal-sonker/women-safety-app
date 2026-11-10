# Phase 2 implementation evidence

Date:10 November2026. **Controlled demo implemented; G2 PARTIAL.** User chose Lucknow and allowed dummy data. This authorizes fictional fixtures, not claims about actual streets, police points, lighting, incidents or shop verification. Independent geographic review and a physical-device gate have not occurred.

| Task / requirement | Implemented result / remaining evidence |
|---|---|
| P2-T01 schema/adapter | Migrations007journeys/008routing/009reports+shops/009ahours freshness, canonical generated contracts. GraphHopper adapter is bounded5s/2MiB and separate connection pool; actual GraphHopper route/source-mapping integration not run |
| P2-T02 sources | Repeatable CC0 synthetic Lucknow graph/POIs with explicit provenance/version/boundary. No real OSM import, surveyed lighting, licensed tiles or actual police database claimed |
| P2-T03 ROUTE-01 | Walking graph path search and overlap-controlled alternatives, normalized GeoJSON/ETA/detour and fastest/balanced/condition roles; absence of alternatives/coverage is explicit |
| P2-T04 ROUTE-02/03 | Segment traversal timestamps, solar day/night, lighting/proxy isolation, independent moderated report signal, open participant proxies, fictional help proximity and walking context. Weights.25/.20/.20/.15/.10/.10; unknown neutral with zero quality; coverage<.5 hides numeric indicator; duration mean+.2p95 aggregation; contiguous100m worst stretch |
| P2-T05 validation | Four pure scoring/hours/window tests plus API route/provenance test. Human survey, segment reference labels, real geographic walking-access correctness and held-out scoring validation remain open |
| P2-T06 REPORT-01/02/ADMIN-01 | Pending→moderated reports, categories, daily cap, owner withdrawal, server moderator role, independent-reporter threshold3,250m public cells, identity/precise-coordinate suppression; browser admin queue/details/actions |
| P2-T07 SHOP-01/02 | Owner application/consent/hours edits, scoped moderation, verification vs operating status,30min open confirmation,30day schedule freshness, explicit12h closure precedence, pause/revoke, distance-ranked discovery. Seed shops fictional; real agreements and registration verification absent |
| P2-T08/T09 JOUR-01/02 | One active journey, optional per-contact sharing off by default, UTC ETA/check-in,2min grace, durable row-locked jobs, deadline version, explicit auto-escalation toggle, exactly one linked SOS, arrive/extend/cancel/help; sharing revokes on terminal/escalation and arrival never silently resolves SOS |
| P2-T10/T11 mobile/web | Coordinate entry, MapLibre GeoJSON/SVG route previews, comparison confidence/reasons, manual ETA fallback, journey controls, nearby shops/reporting and history; actual native screen launch/accessibility/performance not validated |
| P2-T12 independent gate | No independent review/field validation; G2 remains PARTIAL rather than a fabricated accepted gate |

Tests and toolchain are recorded in [Phase1 evidence](phase-1.md). Phase2-specific executed tests include route provenance, unknown-data suppression, lighting by traversal time, shop schedule/closure precedence, contiguous worst stretch, idempotent journey deadlines and arrival-after-escalation,3-reporter coarse aggregation, admin isolation and24h journey coordinate purge. Chromium tested fictional route comparison and journey arrival. All provider output was fake.

## Practical limits and recovery

The default small grid covers longitude80.943–80.949/latitude26.848–26.852 with at most100m snapping; the larger Lucknow API boundary is not a claim of street coverage. Out-of-bound/missing routes return structured errors and journey manual ETA remains available. GraphHopper currently reports unjoined source data as unknown and cannot produce confident condition recommendations. A failed routing call does not delay SOS.

Contact ranking considers only registered verified trusted contacts. Distance is evaluated only against separately consented fresh GPS; otherwise declared priority wins. It is not a random nearby responder network. Shops cannot receive emergency alerts without later-phase agreement/consent work. No automatic law-enforcement dispatch exists.

Preserve source version/import checksum and schema ledger. Disable a bad source/version rather than fabricating missing factors; retain journey timers/SOS intents through restarts. Expired route candidates can disappear without canceling journeys. Terminal journey details purge after24h, with nullable destination in retained output; history API remains valid. See [contracts](../../packages/contracts/CONTRACT_LOCK.md) and [running/recovery](../../RUNNING.md).
