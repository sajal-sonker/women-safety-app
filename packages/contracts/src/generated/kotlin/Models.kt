// Generated from OpenAPI; do not edit.
package com.surakshaai.contracts
import com.google.gson.JsonObject
import com.google.gson.annotations.SerializedName

data class Point(
    @SerializedName("lat") val lat: Double,
    @SerializedName("lon") val lon: Double
)

data class Location(
    @SerializedName("lat") val lat: Double,
    @SerializedName("lon") val lon: Double,
    @SerializedName("accuracy_m") val accuracy_m: Double?,
    @SerializedName("captured_at") val captured_at: String,
    @SerializedName("source") val source: String
)

data class Error(
    @SerializedName("error") val error: JsonObject
)

class Empty

data class Health(
    @SerializedName("status") val status: String
)

data class Profile(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("id") val id: String,
    @SerializedName("display_name") val display_name: String,
    @SerializedName("locale") val locale: String,
    @SerializedName("phone_e164") val phone_e164: String,
    @SerializedName("consents") val consents: JsonObject,
    @SerializedName("capabilities") val capabilities: JsonObject
)

data class ProfilePatch(
    @SerializedName("display_name") val display_name: String? = null,
    @SerializedName("locale") val locale: String? = null
)

data class ConsentPatch(
    @SerializedName("version") val version: String,
    @SerializedName("monitoring") val monitoring: Boolean? = null,
    @SerializedName("evidence") val evidence: Boolean? = null,
    @SerializedName("shop_alerts") val shop_alerts: Boolean? = null
)

data class Contact(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("phone_e164") val phone_e164: String,
    @SerializedName("priority") val priority: Int,
    @SerializedName("invite_status") val invite_status: String,
    @SerializedName("location_available") val location_available: Boolean,
    @SerializedName("consent_at") val consent_at: String?
)

data class ContactCreate(
    @SerializedName("name") val name: String,
    @SerializedName("phone_e164") val phone_e164: String,
    @SerializedName("priority") val priority: Int
)

data class ContactPatch(
    @SerializedName("name") val name: String? = null,
    @SerializedName("priority") val priority: Int? = null
)

data class Contacts(
    @SerializedName("items") val items: List<Contact>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class Invitation(
    @SerializedName("invite_id") val invite_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("expires_at") val expires_at: String
)

data class AcceptInvite(
    @SerializedName("token") val token: String,
    @SerializedName("consent_version") val consent_version: String
)

data class DeclineInvite(
    @SerializedName("token") val token: String,
    @SerializedName("block_future_invites") val block_future_invites: Boolean
)

data class Reconsent(
    @SerializedName("consent_version") val consent_version: String
)

data class InvitationItem(
    @SerializedName("invite_id") val invite_id: String,
    @SerializedName("contact_id") val contact_id: String,
    @SerializedName("owner_display_name") val owner_display_name: String,
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("status") val status: String
)

data class Invitations(
    @SerializedName("items") val items: List<InvitationItem>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class ContactConsent(
    @SerializedName("contact_id") val contact_id: String,
    @SerializedName("owner_display_name") val owner_display_name: String,
    @SerializedName("status") val status: String,
    @SerializedName("consent_at") val consent_at: String?
)

data class ContactConsents(
    @SerializedName("items") val items: List<ContactConsent>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class DeviceWrite(
    @SerializedName("push_token") val push_token: String,
    @SerializedName("platform") val platform: String,
    @SerializedName("notifications_enabled") val notifications_enabled: Boolean
)

data class Device(
    @SerializedName("device_id") val device_id: String,
    @SerializedName("registered_at") val registered_at: String
)

data class SessionStart(
    @SerializedName("contact_id") val contact_id: String,
    @SerializedName("consent_version") val consent_version: String,
    @SerializedName("duration_minutes") val duration_minutes: Int
)

data class ContactSession(
    @SerializedName("session_id") val session_id: String,
    @SerializedName("expires_at") val expires_at: String
)

data class PositionWrite(
    @SerializedName("sample_id") val sample_id: String,
    @SerializedName("location") val location: Location
)

data class PositionReceipt(
    @SerializedName("sample_id") val sample_id: String,
    @SerializedName("accepted") val accepted: Boolean,
    @SerializedName("is_latest") val is_latest: Boolean
)

data class ContextPatch(
    @SerializedName("battery_pct") val battery_pct: Int? = null,
    @SerializedName("motion_context") val motion_context: String? = null,
    @SerializedName("motion_confidence") val motion_confidence: Double? = null,
    @SerializedName("speed_mps") val speed_mps: Double? = null,
    @SerializedName("observed_at") val observed_at: String
)

data class ContextView(
    @SerializedName("battery_pct") val battery_pct: Int?,
    @SerializedName("motion_context") val motion_context: String,
    @SerializedName("motion_confidence") val motion_confidence: Double?,
    @SerializedName("speed_mps") val speed_mps: Double?,
    @SerializedName("observed_at") val observed_at: String?,
    @SerializedName("age_s") val age_s: Double?,
    @SerializedName("stale") val stale: Boolean,
    @SerializedName("landmark") val landmark: JsonObject?
)

data class SosCreate(
    @SerializedName("trigger_type") val trigger_type: String,
    @SerializedName("client_request_id") val client_request_id: String,
    @SerializedName("triggered_at") val triggered_at: String,
    @SerializedName("location") val location: Location?,
    @SerializedName("location_status") val location_status: String,
    @SerializedName("device_context") val device_context: ContextPatch? = null
)

data class SosCreated(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("event_id") val event_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("dispatch_status") val dispatch_status: String,
    @SerializedName("created_at") val created_at: String,
    @SerializedName("initial_location_at") val initial_location_at: String?,
    @SerializedName("eligible_recipient_count") val eligible_recipient_count: Int,
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("replayed") val replayed: Boolean,
    @SerializedName("emergency_call_number") val emergency_call_number: String,
    @SerializedName("warnings") val warnings: List<String>
)

data class Recipient(
    @SerializedName("id") val id: String,
    @SerializedName("contact_id") val contact_id: String,
    @SerializedName("priority_rank") val priority_rank: Int,
    @SerializedName("role") val role: String,
    @SerializedName("acknowledgement") val acknowledgement: String,
    @SerializedName("acknowledged_at") val acknowledged_at: String?,
    @SerializedName("eta_minutes") val eta_minutes: Int?,
    @SerializedName("channels") val channels: List<JsonObject>
)

data class EvidenceMetadata(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("id") val id: String,
    @SerializedName("kind") val kind: String,
    @SerializedName("mime") val mime: String,
    @SerializedName("size_bytes") val size_bytes: Int,
    @SerializedName("duration_s") val duration_s: Double?,
    @SerializedName("captured_at") val captured_at: String,
    @SerializedName("status") val status: String,
    @SerializedName("delete_after") val delete_after: String
)

data class SosDetail(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("event_id") val event_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("dispatch_status") val dispatch_status: String,
    @SerializedName("created_at") val created_at: String,
    @SerializedName("initial_location_at") val initial_location_at: String?,
    @SerializedName("eligible_recipient_count") val eligible_recipient_count: Int,
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("replayed") val replayed: Boolean,
    @SerializedName("emergency_call_number") val emergency_call_number: String,
    @SerializedName("warnings") val warnings: List<String>,
    @SerializedName("trigger_type") val trigger_type: String,
    @SerializedName("resolution") val resolution: String?,
    @SerializedName("position") val position: Location?,
    @SerializedName("location_age_s") val location_age_s: Double?,
    @SerializedName("context") val context: ContextView,
    @SerializedName("recipients") val recipients: List<Recipient>,
    @SerializedName("evidence") val evidence: List<EvidenceMetadata>
)

data class SosSummary(
    @SerializedName("event_id") val event_id: String,
    @SerializedName("trigger_type") val trigger_type: String,
    @SerializedName("status") val status: String,
    @SerializedName("dispatch_status") val dispatch_status: String,
    @SerializedName("created_at") val created_at: String,
    @SerializedName("ended_at") val ended_at: String?
)

data class SosHistory(
    @SerializedName("items") val items: List<SosSummary>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class Resolve(
    @SerializedName("resolution") val resolution: String,
    @SerializedName("note") val note: String? = null
)

data class Terminate(
    @SerializedName("reason") val reason: String
)

data class Terminated(
    @SerializedName("intent_state") val intent_state: String,
    @SerializedName("event_id") val event_id: String?,
    @SerializedName("status") val status: String?
)

data class GrantIssued(
    @SerializedName("grant_id") val grant_id: String,
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("dispatch_status") val dispatch_status: String
)

data class Exchange(
    @SerializedName("token") val token: String,
    @SerializedName("exchange_id") val exchange_id: String
)

data class Exchanged(
    @SerializedName("grant_id") val grant_id: String,
    @SerializedName("grant_kind") val grant_kind: String,
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("csrf_token") val csrf_token: String
)

data class TrackingView(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("event_id") val event_id: String,
    @SerializedName("event_status") val event_status: String,
    @SerializedName("started_at") val started_at: String,
    @SerializedName("trigger_class") val trigger_class: String,
    @SerializedName("shared_name") val shared_name: String,
    @SerializedName("position") val position: Location?,
    @SerializedName("location_age_s") val location_age_s: Double?,
    @SerializedName("context") val context: ContextView,
    @SerializedName("priority_role") val priority_role: String,
    @SerializedName("own_acknowledgement") val own_acknowledgement: String,
    @SerializedName("assisting_count") val assisting_count: Int,
    @SerializedName("evidence") val evidence: List<EvidenceMetadata>,
    @SerializedName("expires_at") val expires_at: String
)

data class Locations(
    @SerializedName("items") val items: List<JsonObject>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class Acknowledge(
    @SerializedName("can_assist") val can_assist: Boolean,
    @SerializedName("eta_minutes") val eta_minutes: Int? = null
)

data class Acknowledged(
    @SerializedName("acknowledgement") val acknowledgement: String,
    @SerializedName("eta_minutes") val eta_minutes: Int?,
    @SerializedName("revision") val revision: Int
)

data class BrowserSessionStart(
    @SerializedName("id_token") val id_token: String
)

data class BrowserSession(
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("csrf_token") val csrf_token: String
)

data class JourneyCreate(
    @SerializedName("origin") val origin: Location? = null,
    @SerializedName("destination") val destination: Point,
    @SerializedName("expected_arrival_at") val expected_arrival_at: String,
    @SerializedName("selected_route_id") val selected_route_id: String? = null,
    @SerializedName("auto_escalate") val auto_escalate: Boolean,
    @SerializedName("share_with_contacts") val share_with_contacts: Boolean,
    @SerializedName("contact_ids") val contact_ids: List<String>
)

data class Journey(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("journey_id") val journey_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("origin") val origin: Location?,
    @SerializedName("destination") val destination: Point?,
    @SerializedName("selected_route_id") val selected_route_id: String?,
    @SerializedName("expected_arrival_at") val expected_arrival_at: String,
    @SerializedName("checkin_due_at") val checkin_due_at: String,
    @SerializedName("escalate_at") val escalate_at: String,
    @SerializedName("auto_escalate") val auto_escalate: Boolean,
    @SerializedName("share_with_contacts") val share_with_contacts: Boolean,
    @SerializedName("contact_ids") val contact_ids: List<String>,
    @SerializedName("deadline_version") val deadline_version: Int,
    @SerializedName("sos_event_id") val sos_event_id: String?,
    @SerializedName("expires_at") val expires_at: String
)

data class Journeys(
    @SerializedName("items") val items: List<Journey>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class CheckIn(
    @SerializedName("answer") val answer: String,
    @SerializedName("extend_minutes") val extend_minutes: Int? = null,
    @SerializedName("expected_deadline_version") val expected_deadline_version: Int
)

data class Sharing(
    @SerializedName("enabled") val enabled: Boolean,
    @SerializedName("contact_ids") val contact_ids: List<String>
)

data class JourneyTracking(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("journey_id") val journey_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("shared_name") val shared_name: String,
    @SerializedName("position") val position: Location?,
    @SerializedName("location_age_s") val location_age_s: Double?,
    @SerializedName("expected_arrival_at") val expected_arrival_at: String,
    @SerializedName("expires_at") val expires_at: String
)

data class RouteRequest(
    @SerializedName("origin") val origin: Point,
    @SerializedName("destination") val destination: Point,
    @SerializedName("depart_at") val depart_at: String,
    @SerializedName("mode") val mode: String
)

data class LineString(
    @SerializedName("type") val type: String,
    @SerializedName("coordinates") val coordinates: List<List<Double>>
)

data class RouteCandidate(
    @SerializedName("id") val id: String,
    @SerializedName("geometry") val geometry: LineString,
    @SerializedName("eta_seconds") val eta_seconds: Double,
    @SerializedName("distance_m") val distance_m: Double,
    @SerializedName("risk_indicator") val risk_indicator: Int?,
    @SerializedName("confidence") val confidence: Double,
    @SerializedName("detour_pct") val detour_pct: Double,
    @SerializedName("reason_codes") val reason_codes: List<String>,
    @SerializedName("explanations") val explanations: List<String>,
    @SerializedName("segments_summary") val segments_summary: List<JsonObject>,
    @SerializedName("worst_stretch") val worst_stretch: JsonObject?,
    @SerializedName("source_refs") val source_refs: List<String>
)

data class RouteEvaluation(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("evaluation_id") val evaluation_id: String,
    @SerializedName("score_version") val score_version: String,
    @SerializedName("data_version") val data_version: String,
    @SerializedName("computed_at") val computed_at: String,
    @SerializedName("routes") val routes: List<RouteCandidate>,
    @SerializedName("roles") val roles: JsonObject,
    @SerializedName("coverage_warning") val coverage_warning: String?,
    @SerializedName("alternatives_reason") val alternatives_reason: String?
)

data class Hours(
    @SerializedName("timezone") val timezone: String,
    @SerializedName("weekly") val weekly: List<JsonObject>,
    @SerializedName("exceptions") val exceptions: List<JsonObject>
)

data class Shop(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("position") val position: Point,
    @SerializedName("public_phone") val public_phone: String?,
    @SerializedName("status") val status: String,
    @SerializedName("verification_level") val verification_level: String,
    @SerializedName("verified_at") val verified_at: String?,
    @SerializedName("hours") val hours: Hours,
    @SerializedName("open_status") val open_status: String,
    @SerializedName("confirmed_at") val confirmed_at: String?,
    @SerializedName("confirmation_expires_at") val confirmation_expires_at: String?,
    @SerializedName("availability_override") val availability_override: JsonObject?,
    @SerializedName("distance_m") val distance_m: Double?,
    @SerializedName("walking_eta_s") val walking_eta_s: Double?,
    @SerializedName("listing_consent_version") val listing_consent_version: String,
    @SerializedName("opt_in_alerts") val opt_in_alerts: Boolean,
    @SerializedName("agreement_version") val agreement_version: String?
)

data class Shops(
    @SerializedName("items") val items: List<Shop>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class ShopApply(
    @SerializedName("name") val name: String,
    @SerializedName("position") val position: Point,
    @SerializedName("public_phone") val public_phone: String?,
    @SerializedName("hours") val hours: Hours,
    @SerializedName("listing_consent_version") val listing_consent_version: String,
    @SerializedName("opt_in_alerts") val opt_in_alerts: Boolean,
    @SerializedName("agreement_version") val agreement_version: String?
)

data class ShopPatch(
    @SerializedName("name") val name: String? = null,
    @SerializedName("public_phone") val public_phone: String? = null,
    @SerializedName("hours") val hours: Hours? = null,
    @SerializedName("listing_consent_version") val listing_consent_version: String? = null
)

data class ShopAvailability(
    @SerializedName("action") val action: String,
    @SerializedName("expected_revision") val expected_revision: Int
)

data class ShopModerate(
    @SerializedName("action") val action: String,
    @SerializedName("reason") val reason: String,
    @SerializedName("expected_revision") val expected_revision: Int
)

data class ReportCreate(
    @SerializedName("category") val category: String,
    @SerializedName("location") val location: Location,
    @SerializedName("happened_at") val happened_at: String,
    @SerializedName("description") val description: String? = null
)

data class Report(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("revision") val revision: Int,
    @SerializedName("updated_at") val updated_at: String,
    @SerializedName("server_time") val server_time: String,
    @SerializedName("id") val id: String,
    @SerializedName("category") val category: String,
    @SerializedName("location") val location: Location,
    @SerializedName("happened_at") val happened_at: String,
    @SerializedName("description") val description: String?,
    @SerializedName("status") val status: String,
    @SerializedName("created_at") val created_at: String,
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("moderation_reason") val moderation_reason: String?
)

data class Reports(
    @SerializedName("items") val items: List<Report>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class ReportModerate(
    @SerializedName("action") val action: String,
    @SerializedName("reason") val reason: String,
    @SerializedName("expected_revision") val expected_revision: Int
)

data class Polygon(
    @SerializedName("type") val type: String,
    @SerializedName("coordinates") val coordinates: List<List<List<Double>>>
)

data class Aggregates(
    @SerializedName("schema_version") val schema_version: Int,
    @SerializedName("cells") val cells: List<JsonObject>,
    @SerializedName("suppression_m") val suppression_m: Int,
    @SerializedName("server_time") val server_time: String
)

data class ReviewQueue(
    @SerializedName("items") val items: List<JsonObject>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class ProviderReceipt(
    @SerializedName("receipt_id") val receipt_id: String,
    @SerializedName("provider_message_ref") val provider_message_ref: String,
    @SerializedName("status") val status: String
)

data class EvidencePresign(
    @SerializedName("kind") val kind: String,
    @SerializedName("mime") val mime: String,
    @SerializedName("size_bytes") val size_bytes: Int,
    @SerializedName("sha256") val sha256: String,
    @SerializedName("duration_s") val duration_s: Double?,
    @SerializedName("captured_at") val captured_at: String,
    @SerializedName("consent_version") val consent_version: String,
    @SerializedName("recipient_ids") val recipient_ids: List<String>
)

data class EvidenceUpload(
    @SerializedName("asset_id") val asset_id: String,
    @SerializedName("upload_url") val upload_url: String,
    @SerializedName("expires_at") val expires_at: String,
    @SerializedName("required_headers") val required_headers: JsonObject,
    @SerializedName("storage_mode") val storage_mode: String
)

data class ContextResult(
    @SerializedName("context") val context: ContextView,
    @SerializedName("revision") val revision: Int
)

data class NavigationInput(
    @SerializedName("origin") val origin: Point,
    @SerializedName("consent") val consent: Boolean
)

data class Navigation(
    @SerializedName("distance_m") val distance_m: Double?,
    @SerializedName("eta_seconds") val eta_seconds: Int?,
    @SerializedName("method") val method: String,
    @SerializedName("warning") val warning: String
)

data class ExportAccepted(
    @SerializedName("job_id") val job_id: String,
    @SerializedName("status") val status: String
)

data class ExportJob(
    @SerializedName("job_id") val job_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("expires_at") val expires_at: String?
)

data class DeleteAccount(
    @SerializedName("confirm_end_active_sharing") val confirm_end_active_sharing: Boolean
)

data class DeletionAccepted(
    @SerializedName("deletion_job_id") val deletion_job_id: String,
    @SerializedName("status") val status: String
)

data class DeletionJob(
    @SerializedName("deletion_job_id") val deletion_job_id: String,
    @SerializedName("status") val status: String
)

data class ShopAlertInput(
    @SerializedName("shop_id") val shop_id: String,
    @SerializedName("sharing_consent_version") val sharing_consent_version: String
)

data class ShopAlert(
    @SerializedName("shop_alert_id") val shop_alert_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("expires_at") val expires_at: String
)

data class ShopTracking(
    @SerializedName("event_id") val event_id: String,
    @SerializedName("status") val status: String,
    @SerializedName("position") val position: Location?,
    @SerializedName("location_age_s") val location_age_s: Double?,
    @SerializedName("arrival_eta_s") val arrival_eta_s: Double?,
    @SerializedName("expires_at") val expires_at: String
)

data class AcceptInboxInvite(
    @SerializedName("consent_version") val consent_version: String
)

data class DeclineInboxInvite(
    @SerializedName("block_future_invites") val block_future_invites: Boolean
)

data class ReceivedAlert(
    @SerializedName("grant_id") val grant_id: String,
    @SerializedName("kind") val kind: String,
    @SerializedName("shared_name") val shared_name: String,
    @SerializedName("started_at") val started_at: String,
    @SerializedName("expires_at") val expires_at: String
)

data class ReceivedAlerts(
    @SerializedName("items") val items: List<ReceivedAlert>,
    @SerializedName("next_cursor") val next_cursor: String?
)

data class ReceivedAlertDetail(
    @SerializedName("grant_id") val grant_id: String,
    @SerializedName("kind") val kind: String,
    @SerializedName("event") val event: TrackingView?,
    @SerializedName("journey") val journey: JourneyTracking?
)
