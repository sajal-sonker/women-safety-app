package com.surakshaai.triggers

import android.app.*
import android.content.*
import android.media.*
import android.os.*
import android.util.Base64
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.surakshaai.*
import org.bouncycastle.crypto.generators.SCrypt
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant

object DiscreetControls {
    private val random=SecureRandom()
    private var tone:Ringtone?=null
    private var focus:AudioFocusRequest?=null
    @Volatile var visible=false
    var focusedKeys=false
    private val keys=mutableListOf<Pair<Int,Long>>()
    private var lastKeyTrigger=0L
    private fun encode(b:ByteArray)=Base64.encodeToString(b,Base64.NO_WRAP)
    private fun derive(pin:String,salt:ByteArray)=SCrypt.generate(pin.toByteArray(Charsets.UTF_8),salt,32768,8,1,32)
    private fun recentAuth(){
        val user=SafetyRuntime.auth.currentUser?:throw HttpFailure(401,"UNAUTHENTICATED")
        val token=com.google.android.gms.tasks.Tasks.await(user.getIdToken(true),12,java.util.concurrent.TimeUnit.SECONDS)
        val at=(token.claims["auth_time"] as? Number)?.toLong()?:0
        require(Instant.now().epochSecond-at in 0..300){"RECENT_AUTH_REQUIRED"}
    }
    @Synchronized fun setup(normal:String,duress:String):JSONObject {
        require(visible);recentAuth()
        require(normal.matches(Regex("[0-9]{6,12}"))&&duress.matches(Regex("[0-9]{6,12}"))&&normal!=duress)
        val saltA=ByteArray(32).also(random::nextBytes);val saltB=ByteArray(32).also(random::nextBytes)
        val started=SystemClock.elapsedRealtime()
        val value=JSONObject().put("uid",SafetyRuntime.auth.currentUser!!.uid).put("salt_a",encode(saltA)).put("salt_b",encode(saltB))
            .put("normal",encode(derive(normal,saltA))).put("duress",encode(derive(duress,saltB))).put("attempts",0).put("blocked_until",0)
            .put("kdf_ms",SystemClock.elapsedRealtime()-started)
        SafetyRuntime.store.update{it.put("pins",value);it.remove("decoy")}
        return JSONObject().put("status","CONFIGURED").put("kdf_ms",value.getLong("kdf_ms"))
    }
    @Synchronized fun unlock(pin:String,practice:Boolean):JSONObject {
        require(visible&&pin.matches(Regex("[0-9]{6,12}")))
        val value=SafetyRuntime.store.read().optJSONObject("pins")?:throw HttpFailure(409,"SETUP_REQUIRED")
        require(value.getString("uid")==SafetyRuntime.auth.currentUser?.uid)
        val until=value.optLong("blocked_until");val now=System.currentTimeMillis()
        require(now>=until&&now>=value.optLong("last_attempt_wall")){"TRY_LATER"}
        val a=derive(pin,Base64.decode(value.getString("salt_a"),Base64.NO_WRAP))
        val b=derive(pin,Base64.decode(value.getString("salt_b"),Base64.NO_WRAP))
        val normal=MessageDigest.isEqual(a,Base64.decode(value.getString("normal"),Base64.NO_WRAP))
        val duress=MessageDigest.isEqual(b,Base64.decode(value.getString("duress"),Base64.NO_WRAP));a.fill(0);b.fill(0)
        if(!normal&&!duress){
            val attempts=(value.optInt("attempts")+1).coerceAtMost(20)
            SafetyRuntime.store.update{it.getJSONObject("pins").put("attempts",attempts).put("last_attempt_wall",now).put("blocked_until",now+minOf(3600000L,1000L*(1L shl minOf(attempts,12))))}
            throw HttpFailure(401,"PIN_NOT_ACCEPTED")
        }
        SafetyRuntime.store.update{it.getJSONObject("pins").put("attempts",0).put("blocked_until",0).put("last_attempt_wall",now);if(!practice)it.put("decoy",duress)}
        if(duress&&!practice)SafetyRuntime.activate("DURESS_PIN")
        return JSONObject().put("screen",if(duress)"NOTES" else "HOME").put("practice",practice)
    }
    fun reset():JSONObject {require(visible);recentAuth();SafetyRuntime.store.update{it.remove("pins");it.remove("decoy")};return JSONObject().put("status","RESET")}
    private fun alarmIntent():PendingIntent=PendingIntent.getBroadcast(SafetyRuntime.context,611,Intent(SafetyRuntime.context,FakeCallReminder::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun schedule(label:String,seconds:Int):JSONObject {
        require(visible&&SafetyRuntime.auth.currentUser!=null&&label.length in 1..80&&seconds in 0..3600)
        cancel()
        val call=JSONObject().put("id",java.util.UUID.randomUUID().toString()).put("uid",SafetyRuntime.auth.currentUser!!.uid).put("label",label).put("due",SystemClock.elapsedRealtime()+seconds*1000L).put("ringing",seconds==0)
        if(seconds==0){SafetyRuntime.store.update{it.put("fake_call",call)};ring();return JSONObject().put("status","SIMULATION")}
        require(NotificationManagerCompat.from(SafetyRuntime.context).areNotificationsEnabled()){"NOTIFICATION_PERMISSION_REQUIRED"}
        SafetyRuntime.store.update{it.put("fake_call",call)}
        (SafetyRuntime.context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP,SystemClock.elapsedRealtime()+seconds*1000L,alarmIntent())
        return JSONObject().put("status","REMINDER_SCHEDULED").put("precision","INEXACT")
    }
    fun ring(){
        if(!visible)return
        val call=SafetyRuntime.store.read().optJSONObject("fake_call")?:return
        if(call.optString("uid")!=SafetyRuntime.auth.currentUser?.uid){cancel();return}
        if(!call.optBoolean("ringing")||call.has("answered_at")||tone?.isPlaying==true)return
        val manager=SafetyRuntime.context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if(manager.mode!=AudioManager.MODE_NORMAL)return
        val request=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build()).setOnAudioFocusChangeListener{change->if(change!=AudioManager.AUDIOFOCUS_GAIN)stopSound()}.build()
        if(manager.requestAudioFocus(request)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED)return
        focus=request;tone=RingtoneManager.getRingtone(SafetyRuntime.context,RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)).apply{isLooping=true;play()}
        val id=call.optString("id")
        Handler(Looper.getMainLooper()).postDelayed({val current=SafetyRuntime.store.read().optJSONObject("fake_call");if(current?.optString("id")==id&&!current.has("answered_at"))cancel()},30000)
    }
    fun stopSound(){tone?.stop();tone=null;focus?.let{(SafetyRuntime.context.getSystemService(Context.AUDIO_SERVICE) as AudioManager).abandonAudioFocusRequest(it)};focus=null}
    fun answer():JSONObject {
        require(visible)
        stopSound()
        SafetyRuntime.store.update{s->s.optJSONObject("fake_call")?.takeIf{it.optBoolean("ringing")}?.put("answered_at",System.currentTimeMillis())}
        return JSONObject().put("status","ANSWERED")
    }
    fun cancel(){(SafetyRuntime.context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarmIntent());stopSound();SafetyRuntime.store.update{it.remove("fake_call")};NotificationManagerCompat.from(SafetyRuntime.context).cancel(611)}
    fun onKey(code:Int,repeat:Int){
        if(!focusedKeys||!visible||repeat!=0||code !in listOf(24,25))return
        val now=SystemClock.elapsedRealtime();keys.removeAll{now-it.second>2500};keys.add(code to now)
        if(keys.size>4)keys.removeAt(0)
        if(keys.map{it.first}==listOf(24,25,24,25)&&(lastKeyTrigger==0L||now-lastKeyTrigger>120000)){lastKeyTrigger=now;keys.clear();SafetyRuntime.io.execute{runCatching{SafetyRuntime.activate("VOLUME_CODE")}}}
    }
}
class FakeCallReminder:BroadcastReceiver(){
    override fun onReceive(context:Context,intent:Intent){
        SafetyRuntime.setup(context)
        val value=SafetyRuntime.store.read().optJSONObject("fake_call")?:return
        if(value.optString("uid")!=SafetyRuntime.auth.currentUser?.uid){DiscreetControls.cancel();return}
        SafetyRuntime.store.update{it.getJSONObject("fake_call").put("ringing",true)}
        if(DiscreetControls.visible){DiscreetControls.ring();return}
        val manager=context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("simulation","Simulation reminders",NotificationManager.IMPORTANCE_DEFAULT))
        val open=PendingIntent.getActivity(context,611,Intent(context,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        runCatching{manager.notify(611,NotificationCompat.Builder(context,"simulation").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Open your scheduled simulation").setContentText("Tap to open. Timing and lock-screen presentation may vary.").setContentIntent(open).setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build())}
    }
}
