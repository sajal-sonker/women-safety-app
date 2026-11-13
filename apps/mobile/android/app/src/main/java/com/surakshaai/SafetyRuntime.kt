package com.surakshaai

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.SystemClock
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.surakshaai.contracts.SosCreate
import com.surakshaai.contracts.Contract
import com.surakshaai.contracts.Location as WireLocation
import com.surakshaai.journal.SecureStore
import com.surakshaai.location.SafetyLocationService
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.time.Instant
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.ConcurrentHashMap

class HttpFailure(val status: Int, val code: String): Exception(code)

object SafetyRuntime {
    private val gson = GsonBuilder().serializeNulls().create()
    lateinit var context: Context
    lateinit var store: SecureStore
    lateinit var auth: FirebaseAuth
    var baseUrl = BuildConfig.API_BASE_URL
    val io = Executors.newFixedThreadPool(3)
    private val sosExecutor = Executors.newSingleThreadScheduledExecutor()
    private val retrying = ConcurrentHashMap<String, ScheduledFuture<*>>()
    val locationPurposes = ConcurrentHashMap<String,Pair<String,Long>>()
    var listener: ((JSONObject) -> Unit)? = null
    @Synchronized fun setup(ctx: Context) {
        if (::context.isInitialized) return
        context = ctx.applicationContext
        store = SecureStore(context)
        val app = FirebaseApp.getApps(context).firstOrNull() ?: FirebaseApp.initializeApp(context,
            FirebaseOptions.Builder().setApplicationId(BuildConfig.FIREBASE_APP_ID)
                .setProjectId(BuildConfig.FIREBASE_PROJECT_ID).setApiKey(BuildConfig.FIREBASE_API_KEY).build())
        auth = FirebaseAuth.getInstance(app)
        if (BuildConfig.CONTROLLED_DEMO && BuildConfig.FIREBASE_PROJECT_ID.startsWith("demo-")) {
            auth.useEmulator(URI(baseUrl).host, 9099)
            auth.firebaseAuthSettings.setAppVerificationDisabledForTesting(true)
        }
    }
    fun initialize(json: String): String {
        val value = JSONObject(json)
        if(value.has("contract_sha256"))require(value.getString("contract_sha256")==Contract.SHA256)
        val requested = value.optString("api_base_url", baseUrl)
        val localEmulator=BuildConfig.CONTROLLED_DEMO&&BuildConfig.FIREBASE_PROJECT_ID.startsWith("demo-")
        require(NetworkEndpointPolicy.allowed(requested,localEmulator)&&
            (requested.trimEnd('/')==BuildConfig.API_BASE_URL.trimEnd('/')||localEmulator&&URI(requested).host in listOf("127.0.0.1","localhost","10.0.2.2"))){"SERVER_CONFIGURATION_REQUIRED"}
        baseUrl = requested.trimEnd('/')
        recover()
        return state().toString()
    }
    fun authState(): JSONObject = JSONObject().apply {
        put("auth_mode",if(BuildConfig.CONTROLLED_DEMO&&BuildConfig.FIREBASE_PROJECT_ID.startsWith("demo-"))"EMULATOR" else "FIREBASE")
        put("uid", auth.currentUser?.uid ?: JSONObject.NULL)
        put("phone", auth.currentUser?.phoneNumber ?: JSONObject.NULL)
    }
    fun request(path: String, method: String, body: String = "", key: String = "", headers: JSONObject = JSONObject()): String {
        require(path.startsWith("/") && !path.startsWith("//") && !path.contains("://"))
        val requestKey = if(key.isBlank() && method!="GET") UUID.randomUUID().toString() else key
        fun perform(refresh: Boolean): Pair<Int,String> {
            val user = auth.currentUser ?: throw HttpFailure(401, "UNAUTHENTICATED")
            val bearer = Tasks.await(user.getIdToken(refresh), 12, TimeUnit.SECONDS).token ?: throw HttpFailure(401,"UNAUTHENTICATED")
            val connection = URL(baseUrl + "/v1" + path).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = method
                connection.connectTimeout = 7000
                connection.readTimeout = 10000
                connection.instanceFollowRedirects = false
                connection.setRequestProperty("Authorization", "Bearer $bearer")
                if (requestKey.isNotEmpty()) connection.setRequestProperty("Idempotency-Key",requestKey)
                headers.keys().forEach { connection.setRequestProperty(it, headers.getString(it)) }
                if (body.isNotEmpty()) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(body.toByteArray()) }
                }
                val status = connection.responseCode
                val text = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
                return status to text
            } finally { connection.disconnect() }
        }
        var result = perform(false)
        if (result.first == 401) result = perform(true)
        if (result.first !in 200..299) throw HttpFailure(result.first,
            runCatching { JSONObject(result.second).getJSONObject("error").getString("code") }.getOrDefault("REQUEST_FAILED"))
        return if (result.second.isBlank()) "{}" else result.second
    }
    fun latestLocation(): Location? {
        val allowed = ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED
        if (!allowed) return null
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return runCatching { manager.getProviders(true).mapNotNull { manager.getLastKnownLocation(it) }.maxByOrNull { it.time } }.getOrNull()
    }
    fun wire(location: Location): WireLocation = WireLocation(location.latitude,location.longitude,
        if(location.hasAccuracy())location.accuracy.toDouble() else null,Instant.ofEpochMilli(location.time).toString(),"gps")
    fun locationJson(location: Location): JSONObject = JSONObject(gson.toJson(wire(location)))
    fun activate(trigger:String):JSONObject = activateIntent(trigger,false,null)
    fun activateForAccount(trigger:String,expectedUid:String):JSONObject=activateIntent(trigger,false,expectedUid)
    fun activateVoiceSos(expectedUid:String):JSONObject {
        require(auth.currentUser?.uid==expectedUid && com.surakshaai.monitoring.AudioMonitoringService.allowsAutomaticSos(expectedUid)) { "AUTO_DISPATCH_DISABLED" }
        return activateIntent("ML_FUSION",true,expectedUid)
    }
    @Synchronized private fun activateIntent(trigger: String,automaticSessionAuthorized:Boolean,expectedUid:String?): JSONObject {
        require(SosTriggerPolicy.allowed(trigger,BuildConfig.CONTROLLED_DEMO,automaticSessionAuthorized)) { "FEATURE_DISABLED" }
        val user = auth.currentUser ?: throw HttpFailure(401,"UNAUTHENTICATED")
        require(expectedUid==null||expectedUid==user.uid){"AUTH_FLOW_EXPIRED"}
        if(trigger=="ML_FUSION")require(com.surakshaai.monitoring.AudioMonitoringService.allowsAutomaticSos(user.uid)){"AUTO_DISPATCH_DISABLED"}
        val existing=store.read().optJSONObject("active")
        if(existing?.optString("state")=="RECONFIRM_REQUIRED")throw HttpFailure(409,"TERMINATE_PREVIOUS_INTENT")
        if(existing!=null && existing.optString("uid")==user.uid && existing.optString("state") !in listOf("TERMINATED","RECONFIRM_REQUIRED"))
            return publicIntent(existing)
        val key=UUID.randomUUID().toString()
        val fix=latestLocation()
        val body=SosCreate(trigger,key,Instant.now().toString(),fix?.let { wire(it) },
            if(fix==null)"UNAVAILABLE" else if(System.currentTimeMillis()-fix.time>60000)"STALE" else if(fix.hasAccuracy()&&fix.accuracy<=100)"CURRENT" else "APPROXIMATE",null)
        val value=JSONObject().put("uid",user.uid).put("client_request_id",key).put("state","LOCAL_PENDING")
            .put("created_elapsed",SystemClock.elapsedRealtime()).put("created_wall",System.currentTimeMillis())
            .put("boot_count",Settings.Global.getInt(context.contentResolver,Settings.Global.BOOT_COUNT,-1))
            .put("body",JSONObject(gson.toJson(body)).apply{remove("device_context")})
        store.update { it.put("active",value) }
        startLocation("PENDING",key,Instant.now().plusSeconds(300).toString())
        retrying[key]=sosExecutor.schedule({ transmit(key,0) },0,TimeUnit.MILLISECONDS)
        emit(value)
        return publicIntent(value)
    }
    private fun emit(value: JSONObject) { listener?.invoke(publicIntent(value)) }
    private fun publicIntent(value: JSONObject): JSONObject=JSONObject().apply {
        put("client_request_id",value.optString("client_request_id"))
        put("state",value.optString("state"))
        put("event_id",value.opt("event_id")?:JSONObject.NULL)
        put("error",value.opt("error")?:JSONObject.NULL)
    }
    private fun transmit(key: String,attempt: Int) {
        val value=store.read().optJSONObject("active")?:return
        if(value.optString("client_request_id")!=key||value.optString("uid")!=auth.currentUser?.uid)return
        if(value.optString("state")=="STOP_REQUESTED"){terminate(key,value.optString("reason","SAFE"));return}
        if(value.optString("state") in listOf("SERVER_ACCEPTED","TERMINATED","RECONFIRM_REQUIRED"))return
        val elapsed=SystemClock.elapsedRealtime()-value.optLong("created_elapsed")
        val wallElapsed=System.currentTimeMillis()-value.optLong("created_wall")
        val boot=Settings.Global.getInt(context.contentResolver,Settings.Global.BOOT_COUNT,-1)
        if(elapsed<0||elapsed>300000||wallElapsed<0||wallElapsed>300000||boot!=value.optInt("boot_count",-1)){
            store.update { s->s.optJSONObject("active")?.takeIf{it.optString("state")!="STOP_REQUESTED"}?.apply{put("state","RECONFIRM_REQUIRED");remove("body")} }
            stopLocation("PENDING",key);emit(store.read().getJSONObject("active"));return
        }
        try {
            var payload:String?=null
            store.update { s->s.optJSONObject("active")?.takeIf{it.optString("client_request_id")==key&&it.optString("state") in listOf("LOCAL_PENDING","IN_FLIGHT","OUTCOME_UNKNOWN")}?.apply{put("state","IN_FLIGHT");payload=getJSONObject("body").toString()} }
            if(payload==null)return
            val response=JSONObject(request("/sos","POST",payload!!,key))
            store.update { s->s.getJSONObject("active").apply {
                put("event_id",response.getString("event_id"))
                if(response.getString("status") in listOf("RESOLVED","CANCELLED"))put("state","TERMINATED")
                else if(optString("state")!="STOP_REQUESTED")put("state","SERVER_ACCEPTED")
                put("expires_at",response.getString("expires_at"));remove("body")
            } }
            val current=store.read().getJSONObject("active")
            if(current.optString("state")=="STOP_REQUESTED")terminate(key,current.optString("reason","SAFE"))
            else if(current.optString("state")=="SERVER_ACCEPTED") {
                startLocation("SOS",response.getString("event_id"),response.getString("expires_at"))
                stopLocation("PENDING",key)
                retrying[key]=sosExecutor.schedule({reconcile(key)},30,TimeUnit.SECONDS)
            } else {
                stopLocation("SOS",response.getString("event_id"));stopLocation("PENDING",key)
            }
            emit(store.read().getJSONObject("active"))
        } catch(error: Exception) {
            store.update { s->s.optJSONObject("active")?.apply {
                if(optString("state")!="STOP_REQUESTED")put("state",if(error is HttpFailure && error.status in listOf(400,409,503))"RECONFIRM_REQUIRED" else "OUTCOME_UNKNOWN")
                put("error",if(error is HttpFailure)error.code else "NETWORK_UNAVAILABLE")
            } }
            val current=store.read().getJSONObject("active");emit(current)
            if(current.optString("state")=="RECONFIRM_REQUIRED"){
                store.update {it.optJSONObject("active")?.remove("body")};stopLocation("PENDING",key);return
            }
            val delays=longArrayOf(1,2,4,8,16,30)
            retrying[key]=sosExecutor.schedule({transmit(key,attempt+1)},delays[minOf(attempt,5)],TimeUnit.SECONDS)
        }
    }
    fun recover() {
        val value=store.read().optJSONObject("active")?:return
        if(value.optString("uid")!=auth.currentUser?.uid)return
        if(value.optString("state") in listOf("LOCAL_PENDING","IN_FLIGHT","OUTCOME_UNKNOWN","STOP_REQUESTED"))
            sosExecutor.execute { transmit(value.getString("client_request_id"),0) }
        else if(value.optString("state")=="SERVER_ACCEPTED")sosExecutor.execute {reconcile(value.getString("client_request_id"))}
    }
    private fun reconcile(key:String){
        val value=store.read().optJSONObject("active")?:return
        if(value.optString("client_request_id")!=key||value.optString("uid")!=auth.currentUser?.uid||value.optString("state")!="SERVER_ACCEPTED")return
        try{
            val response=JSONObject(request("/sos/by-client-request/$key","GET"))
            if(response.getString("status") in listOf("RESOLVED","CANCELLED")){
                stopLocation("SOS",response.getString("event_id"));stopLocation("PENDING",key)
                store.update { it.optJSONObject("active")?.apply {put("state","TERMINATED");remove("body")} }
                emit(store.read().getJSONObject("active"));return
            }
        }catch(_:Exception){ /* Retain last confirmed transport state; never manufacture resolution. */ }
        retrying[key]=sosExecutor.schedule({reconcile(key)},30,TimeUnit.SECONDS)
    }
    fun terminate(key: String,reason: String): JSONObject {
        require(store.read().optJSONObject("active")?.optString("uid")==auth.currentUser?.uid) { "REAUTHENTICATE_ORIGINAL_ACCOUNT" }
        store.update { s->s.optJSONObject("active")?.takeIf { it.optString("client_request_id")==key }?.apply {put("state","STOP_REQUESTED");put("reason",reason);remove("body")} }
        val value=store.read().optJSONObject("active")?:return JSONObject()
        stopLocation("PENDING",key)
        value.optString("event_id").takeIf { it.isNotBlank() }?.let { stopLocation("SOS",it) }
        try {
            request("/sos/intents/$key/terminate","POST",JSONObject().put("reason",reason).toString(),key)
            store.update { s->s.optJSONObject("active")?.apply{put("state","TERMINATED");remove("body")} }
        } catch(_: Exception) {
            retrying[key]=sosExecutor.schedule({terminate(key,reason)},30,TimeUnit.SECONDS)
        }
        val current=store.read().getJSONObject("active");emit(current);return publicIntent(current)
    }
    fun startLocation(purpose: String,resource: String,expiresAt: String): JSONObject {
        require(purpose in listOf("SOS","JOURNEY","PENDING"))
        val coarse=ContextCompat.checkSelfPermission(context,Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED
        if(!coarse)return JSONObject().put("status","PERMISSION_UNAVAILABLE")
        val activityExpiry=Instant.parse(expiresAt).toEpochMilli()
        if(activityExpiry<=System.currentTimeMillis())return JSONObject().put("status","EXPIRED")
        locationPurposes["$purpose:$resource"]=resource to (SystemClock.elapsedRealtime()+(activityExpiry-System.currentTimeMillis()).coerceAtMost(86400000))
        val intent=Intent(context,SafetyLocationService::class.java).putExtra("purpose",purpose).putExtra("resource",resource).putExtra("expires",activityExpiry)
        return try {ContextCompat.startForegroundService(context,intent);JSONObject().put("status","START_REQUESTED")}
        catch(_:Exception){locationPurposes.remove("$purpose:$resource");JSONObject().put("status","DEGRADED")}
    }
    fun stopLocation(purpose: String,resource: String) {
        locationPurposes.remove("$purpose:$resource")
        SafetyLocationService.current?.removePurpose("$purpose:$resource")
    }
    fun state(): JSONObject = authState().apply {
        put("volume_shortcut",com.surakshaai.triggers.DiscreetControls.keyState())
        val audio=com.surakshaai.monitoring.AudioMonitoringService.state()
        val motion=com.surakshaai.monitoring.MotionSession.state()
        // A previous audio error must not mask a newly active motion fallback.
        put("monitoring",if(com.surakshaai.monitoring.AudioMonitoringService.isActive()||motion.optString("status")=="STOPPED")audio else motion)
        put("fake_call",store.read().optJSONObject("fake_call")?.takeIf{it.optString("uid")==auth.currentUser?.uid}?:JSONObject.NULL)
        put("decoy",store.read().optBoolean("decoy")&&store.read().optJSONObject("pins")?.optString("uid")==auth.currentUser?.uid)
        val pins=store.read().optJSONObject("pins")
        put("pins_configured",pins!=null&&auth.currentUser!=null&&pins.optString("uid")==auth.currentUser?.uid)
        val value=store.read().optJSONObject("active")
        put("intent",if(value!=null&&auth.currentUser!=null&&value.optString("uid")==auth.currentUser?.uid)publicIntent(value) else JSONObject.NULL)
        put("location_status",SafetyLocationService.status)
        put("position",if(locationPurposes.isEmpty())JSONObject.NULL else latestLocation()?.let { locationJson(it) }?:JSONObject.NULL)
    }
}
