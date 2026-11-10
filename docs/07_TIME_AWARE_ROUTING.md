# 07 — Time-aware routing and relative safety score

## Research question

Given origin, destination, walking mode and departure time, can the system rank alternative routes using **interpretable, time-dependent proxies** (lighting, isolation, moderated incident reports, available staffed shops, proximity to assistance and physical road conditions), without pretending to know actual assault probability?

This is a model of **observed/estimated conditions and uncertainty**, not a claim that a route is categorically safe or dangerous. Faculty explicitly requested time-awareness; inputs and implementation details are team-designed.

## Inputs and data provenance

| Normalized factor `r_i(e,t)` | Example raw features | Source/confidence caveat |
|---|---|---|
| `lighting` | `lit=*` tag, time relative to sunset, independently verified street lighting | OSM coverage incomplete; absence of `lit` does not prove darkness |
| `isolation` | proxy for nearby open staffed POIs, land use, pedestrian activity (only if lawful reliable source) | sparse population ≠ crime; avoid demographic proxies |
| `recent_reports` | moderated incident/poor lighting/harassment condition reports, recency and corroboration | crowd data can be false, malicious, geographically biased |
| `shop_gap` | walking distance/time to *open, opted-in* assistance shops, schedule reliability | shops may be closed regardless of stated hours |
| `help_gap` | network distance to police/help points, access via footpaths | station proximity ≠ availability or response time |
| `road_condition` | legal walking access, crossings, footpaths, passability | route legality/physical accessibility more important than score |

For every factor store `value ∈ [0,1]` or null; confidence ∈ [0,1]; provenance; update timestamp; geographic/time coverage. High risk proxy values near `1`. Use `unknown` explicitly if no reliable data. **Never default missing data to 'safe'.**

## Proposed transparent baseline v1 (to validate, not a trained crime model)

Weights are *hypotheses*, to be tuned through sensitivity studies and expert/user review:

```
lighting:       0.25
isolation:      0.20
recent_reports: 0.20
shop_gap:       0.15
help_gap:       0.10
road_condition: 0.10
SUM             1.00
```

For each traversable road segment `e` evaluated at expected traversal time `t_e`:

```
r_e(t_e) = SUM_i w_i * r_i(e,t_e)
```

For unknown input use a *labelled neutral prior*, `r_i=0.5`, but lower the score's confidence based on proportion of weighted features actually observed. Do not let neutral fills imply false precision.

For route `p` with segment traverse times `Δt_e`:

```
mean_risk(p) = SUM_e(Δt_e * r_e(t_e)) / SUM_e Δt_e
p95_risk(p)  = weighted 95th percentile of segment risks by traversal time
composite_risk = 0.80 * mean_risk + 0.20 * p95_risk
risk_indicator_0_100 = round(100 * (1 - composite_risk))
confidence_0_1 = SUM_e Δt_e * feature_coverage(e) / SUM_e Δt_e
```

The p95 term reduces dilution of longer concerning stretches, but can miss a stretch representing less than5% of traversal time. Therefore show a separate worst100m stretch (or whole route if shorter), its factors and coverage; never claim this percentile catches every short hazard. A score of85 means more favorable proxy conditions than45, not85% probability of safety. Publish score_version=v1, parameters and sensitivity results.

## True time awareness (not just an hour label)

- Compute times for each candidate edge `t_e = departure_at + cumulative walking ETA` (including expected crossing delay if data exists).
- Evaluate street lighting **conditional on actual sunset/sunrise** (and tag confidence), open-shop schedules at `t_e`, and time-window incident evidence with recency decay.
- Demonstrate route scores at e.g. 16:00, 19:00, 23:00 with the same origin/destination. Numeric examples in demos must be clearly labelled synthetic until actual data processed.
- Late-night lower scores should arise from feature changes (e.g. shops closing), *not* a hard-coded blanket night danger multiplier.

## Route candidate generation and ranking

1. Import walkable OSM network for a limited pilot geography. Ensure appropriate way access and sidewalks/crossings. GraphHopper can generate default and customized walking alternatives; exact plugin/version capability verified in spike.
2. Generate ~3 distinct feasible routes: `fastest`, `balanced`, `lower_estimated_risk`; deduplicate alternatives by substantial overlap.
3. For each route, sample/associate edge factors, evaluate score and provenance, and enforce time-dependent edge traversal.
4. Choose balanced route using `cost_seconds = eta_seconds + λ * eta_seconds * composite_risk`, subject to a detour cap (proposal: ≤30% longer than fastest; configurable). `λ` is a product trade-off parameter, not a scientifically validated risk-to-time conversion.
5. Show travel duration, detour vs fastest, score, confidence, reason chips (e.g. `less known lighting`, `more staffed shops open`), and a warning for low coverage. Never silently force the user onto the 'recommended' route.
6. If data below coverage threshold (prototype proposal: <50% weighted feature coverage), render `Insufficient data for reliable comparison` and prefer standard safe/legal routing; do not rank by illusory safety numbers.

## Incident reports and bias prevention

Reports enter `PENDING`, are reviewed, deduplicated, capped by source independence, weighted by freshness and corroboration, and decay. No single anonymous report should globally mark a road permanently unsafe. No public display of exact victim location or home coordinates. Independently audit spatial coverage disparity; do not equate lower data coverage with safer streets. Crowd reports are *signals* not ground truth.

## Illustrative response (partial, fictional)

```json
{
  "score_version":"v1",
  "routes":[
    {"id":"552048ab-9ac0-4efc-a008-4000c9381261","eta_seconds":1080,"distance_m":1290,"risk_indicator":74,"confidence":0.77,
     "explanations":["More participating shops expected open","Better observed lighting coverage"]},
    {"id":"552048ab-9ac0-4efc-a008-4000c9381262","eta_seconds":900,"distance_m":1030,"risk_indicator":55,"confidence":0.61,
     "explanations":["Some lighting data unavailable","Less nearby assistance"]}
  ],
  "coverage_warning":"Scores are relative condition estimates, not safety guarantees."
}
```

**Numbers above are fictional demonstration output.**

## Validation plan

- Unit tests: bounded score, monotonicity of a single factor, unknown-data confidence, weights sum 1, sun times, opening hour boundaries, route detour cap, duplicated incident suppression.
- Construct an independent small labelled set of walking segments with observed lighting and verified shop availability; document observation date and protocols.
- Perform ablation and weight sensitivity tests: route order stability when each factor removed/weights varied; examine coverage across neighborhoods/times.
- Compare fastest vs risk-aware detour and explanations without making unsupported claims of reduced actual incidents.
- Report limitations: missing streetlights, shop schedules unreliable, sparse crowd reports, route closures, social bias, user-specific safety preferences, changing real-world conditions.

## Frozen baseline transforms for implementation

These are **reviewer-selected pilot hypotheses**, not measured relationships to victimization. Version as score_v1 with parameter manifest; P2-T05 evaluates sensitivity/coverage before real claims. Unknown input uses0.5 and quality0; never infer absence from missing tags. Let clamp(x)=min(1,max(0,x)). All distances below are legal walking-network distances, not straight-line substituted secretly.

| Factor | Deterministic baseline value | Eligibility/quality |
|---|---|---|
| lighting | daylight (sun above horizon)0.1; night lit=yes0.2, lit=no0.9, missing unknown | daylight proxy quality0.7 (not an observation of every shaded place); at night verified light survey quality0.9, dated OSM tag0.5, unknown-observation-date tag0.3; stale tag unknown |
| isolation | clamp(1−N/8), N=distinct staffed establishments scheduled/confirmed open within200m walking reach at segment time | only if POI inventory coverage has a documented local audit≥0.5; otherwise unknown, not zero establishments. Quality=min(audited coverage,0.5), acknowledging weak activity proxy |
| recent_reports |0.5+0.5×(1−exp(−S/3)); S=sum per independent reporter/cell/day of recency weights exp(−ln2×age_days/30), capped one per source/day | only approved nonexpired coarse cells with≥3 independent reporters; otherwise unknown. Quality≤0.5; moderation is not proof. No reports never means zero risk |
| shop_gap | clamp(d/1000), d=walking metres to nearest ACTIVE listing-consented participating assistance point expected open at traversal | confirmed owner availability quality0.8, scheduled-only0.5; no reachable shop yields1 only with complete pilot network/participant inventory, else unknown. Alert opt-in is separate, required for sending only |
| help_gap | clamp(d/1500), nearest verified publicly accessible police/help point walking metres | verified directory quality0.7; unverified OSM candidate alone0.3; no reliable inventory/reachability unknown; no response-time inference |
| road_condition | pedestrian footway or explicit sidewalk0.1; known permitted road with explicit no sidewalk0.7; unknown tags0.5 prior | legality/closures are hard exclusions before scoring. Source quality0.7 if surveyed,0.5 dated tags; not a disability-accessibility certification |

Freshness defaults: graph/import snapshot30d; source lighting/access tag validity180d from available source timestamp (acquisition alone does not establish observation); independently verified help-point review90d; shop hours review30d, owner-open confirmation30min; reports half-life30d/expiry90d. Missing observation date uses explicitly reduced quality above; expired source→unknown until refreshed. Field observation never fabricated from import time. Manual shop closures/revocation immediately override schedule/confirmation.

Effective edge coverage=sum(weight_i×quality_i) over valid observed factors; route confidence is traversal-time-weighted edge coverage. Use no additional quality normalization that would hide missingness. Factor prior contributes to provisional risk but zero coverage. Coverage<0.50 means null displayed indicator/risk ranking. All route candidates expose versioned factor provenance; source_refs must resolve to import/survey manifests without personal data.

For worst_stretch, slide a100m window over candidate geometry, splitting segments as necessary, choose greatest traversal-weighted proxy risk, ties earliest traversal. Emit its geometry/reason/coverage; low-coverage stretch is labelled uncertain rather than dangerous. Fastest=minETA. Lower_estimated_risk=maxindicator among sufficiently covered candidates. Balanced=min(ETA×(1+composite_risk)) among sufficiently covered candidates within30% fastestETA; if none, balanced=fastest with comparison-unavailable warning. Stable tie-break ETA then routeUUID. Do not manufacture distinct routes when roles coincide.
