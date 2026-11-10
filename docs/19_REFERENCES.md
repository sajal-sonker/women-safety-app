# 19 — Technical and official source links

Checked in preparation for this documentation on **10 November 2026**. These links are for constraints, *not* proof that the project is implemented or that local data is complete. Recheck official documentation and SDK versions when development begins.

## Android platform constraints

1. **Android input events:** hardware key events delivered to focused view/window; no inherent global interception promise. https://developer.android.com/develop/ui/views/touch-and-input/input-events
2. **Foreground services: background start and while-in-use microphone/camera/location restrictions.** https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
3. **Android sensor lifecycle:** Android 9+ continuous sensors restricted to foreground/foreground-service contexts. https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview
4. **Foreground service type/permissions:** https://developer.android.com/develop/background-work/services/fgs/declare
5. **Android privacy guidance:** minimize location access; session-based data collection. https://developer.android.com/privacy-and-security/about
6. **Google Play SMS/Call Log policy:** physical safety/emergency alerts may be an exception requiring review; do not assume unrestricted `SEND_SMS`. https://support.google.com/googleplay/android-developer/answer/10208820

## ML, mapping, auth and budgets

7. **Google LiteRT:** on-device inference and runtime. https://developers.google.com/edge/litert/overview
8. **GraphHopper custom models:** routing edge priorities/weights and model capabilities. https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md
9. **OpenStreetMap wiki:** tag references and data licenses must be verified per extraction: https://wiki.openstreetmap.org/ ; data and licensing: https://www.openstreetmap.org/copyright
10. **Firebase phone OTP documentation:** verification and security tradeoffs. https://firebase.google.com/docs/auth/android/phone-auth
11. **Firebase pricing:** phone auth billed per SMS in pricing table; check regional charges/quota. https://firebase.google.com/pricing/

## Emergency services

12. **India Ministry of Home Affairs ERSS (112):** nationwide emergency number information. https://www.mha.gov.in/index.php/hi/nirbhayaerss-section
13. **112 India official site:** emergency call options; OS-native power-button emergency shortcuts belong to the platform. https://112.gov.in/
14. **National Portal of India helpline directory:** 112 and women's helplines, regional directory details. https://www.india.gov.in/directory/helpline

## User-supplied primary source (not public verification)

- Uploaded: `women's safety app outline.docx` (supplied November 2026): team concept, features, safe-shop proposal, competitor comparison assumptions and basic architecture.
- In-chat team decisions (November 2026): time-aware segment factors; contextual SOS; nearest among trusted emergency contacts; only situational opt-in monitoring; latest faculty suggested Fake PIN + optional low-battery broadcast; low-battery deliberately omitted.

## Evidence standard for viva

Distinguish (a) sourced technical constraints, (b) assumptions or score weights proposed by the team, (c) real measurements on deployed test devices, and (d) limitations/data gaps. Do not replace one category with another.

## Independent review-1.2 verification ledger — 10 November 2026

The following official pages were opened/read during this review; summaries and design inferences are in [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md). These sources establish constraints, not working integrations or passing tests.

| Topic | Primary source / implication |
|---|---|
| Emergency push restriction | [FCM priority guidance](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-priority) and [Google API terms4(a)(7)](https://developers.google.com/terms/) — live emergency use blocked, provider decision required |
| RN lifecycle/maintenance | [Versions](https://reactnative.dev/versions), [release support](https://reactnative.dev/releases/overview), [environment](https://reactnative.dev/docs/set-up-your-environment), [native Codegen](https://reactnative.dev/docs/turbo-native-modules-introduction) |
| Node/Express/web | [Node release schedule](https://github.com/nodejs/Release), [Express5 migration/requirements](https://expressjs.com/en/guide/migrating-5/), [Next installation](https://nextjs.org/docs/app/getting-started/installation) |
| DB/geospatial | [PG support](https://www.postgresql.org/support/versioning/), [PostGIS setup](https://postgis.net/documentation/getting_started/), [ST_DWithin units/indexing](https://postgis.net/docs/ST_DWithin.html), [SELECT locks](https://www.postgresql.org/docs/current/sql-select.html) |
| Android service/location | [BackgroundFGS restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start), [service types](https://developer.android.com/develop/background-work/services/fgs/service-types), [location](https://developer.android.com/develop/sensors-and-location/location/permissions) |
| Android UI/publishing | [Input events](https://developer.android.com/develop/ui/views/touch-and-input/input-events), [Android14 behavior](https://developer.android.com/about/versions/14/behavior-changes-14), [alarms](https://developer.android.com/develop/background-work/services/alarms), [Play target policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en), [native16KB pages](https://developer.android.com/guide/practices/page-sizes) |
| ML/runtime | [LiteRT Android runtime choices/support](https://developers.google.com/edge/litert/android) |
| Routing/rendering/data services | [GraphHopper self-hosted API](https://github.com/graphhopper/graphhopper/blob/master/docs/web/api-doc.md), [custom models](https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md), [MapLibreRN requirements](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) |
| Identity/budget | [Firebase phone auth](https://firebase.google.com/docs/auth/android/phone-auth), [verify ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [auth limits](https://firebase.google.com/docs/auth/limits), [billing FAQ](https://firebase.google.com/docs/auth/faq-and-troubleshooting) |
| DeviceSMS permission | [PlaySMS/Call Log policy](https://support.google.com/googleplay/android-developer/answer/10208820) |
| Emergency call number | [112 official site](https://112.gov.in/) search result confirmed number; direct page fetch timed out. No police-dispatch API was verified. |

Source-access limitations: a guessed GraphHopper alternative-route document path returned404; the working self-hosted API page above supplies the relevant alternative_route/path-details information. PostGIS version-specific install pages attempted were unavailable; exact PG/PostGIS package compatibility therefore remains an explicit setup/image test, not an assertion based on an unread page. Recheck changing policies, patches and prices at execution/release.
