package com.surakshaai.monitoring

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.*
import android.media.*
import android.os.*
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.surakshaai.*
import com.surakshaai.triggers.DiscreetControls
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.sqrt

class AudioMonitoringService:Service(),SensorEventListener {
    companion object {
        @Volatile private var current:AudioMonitoringService?=null
        @Volatile private var pending:JSONObject?=null
        @Volatile private var last=JSONObject().put("status","STOPPED").put("microphone",false).put("auto_dispatch",false).put("check_in",false).put("remaining_seconds",0)
        private fun notificationsAllowed(context:Context):Boolean {
            val manager=context.getSystemService(NotificationManager::class.java)
            return NotificationManagerCompat.from(context).areNotificationsEnabled()&&manager.getNotificationChannel("audio_monitoring")?.importance!=NotificationManager.IMPORTANCE_NONE
        }
        fun start(config:JSONObject):JSONObject {
            require(DiscreetControls.visible&&SafetyRuntime.auth.currentUser!=null){"FOREGROUND_REQUIRED"}
            require(config.optString("mode")=="CONFIRMATION_ONLY"){"AUTO_DISPATCH_DISABLED"}
            require(config.optString("consent_version")=="consent-v1"&&config.optBoolean("audio_consent")&&config.optBoolean("motion_consent")){"CONSENT_REQUIRED"}
            val minutes=config.optInt("duration_minutes",30);require(minutes in 1..120)
            require(ContextCompat.checkSelfPermission(SafetyRuntime.context,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED&&notificationsAllowed(SafetyRuntime.context)){"PERMISSION_UNAVAILABLE"}
            synchronized(AudioMonitoringService::class.java){
                require(current==null&&pending==null&&MicrophoneLease.isFree()){"MICROPHONE_BUSY"}
                MotionSession.stop()
                pending=JSONObject(config.toString()).put("uid",SafetyRuntime.auth.currentUser!!.uid).put("expires_elapsed",SystemClock.elapsedRealtime()+minutes*60000L)
                last=JSONObject().put("status","STARTING").put("microphone",false).put("auto_dispatch",false).put("check_in",false).put("remaining_seconds",minutes*60)
                try{ContextCompat.startForegroundService(SafetyRuntime.context,Intent(SafetyRuntime.context,AudioMonitoringService::class.java))}catch(e:Exception){pending=null;last.put("status","DEGRADED");throw e}
            }
            return state()
        }
        fun stop(reason:String="USER_STOP"){
            synchronized(AudioMonitoringService::class.java){pending=null;val service=current;if(service!=null){service.running.set(false);runCatching{service.recorder?.stop()};Handler(Looper.getMainLooper()).post{service.finish(reason)}}else last=JSONObject(last.toString()).put("status","STOPPED").put("reason",reason).put("microphone",false).put("auto_dispatch",false).put("check_in",false).put("remaining_seconds",0)}
        }
        fun state():JSONObject=JSONObject(last.toString())
        fun isActive()=current!=null||pending!=null
        fun dismissCheckIn(){current?.let{it.checkInUntil=0L;it.getSystemService(NotificationManager::class.java).cancel(4203)}}
    }
    private val running=AtomicBoolean(false)
    private val leaseOwner="MONITORING:"+java.util.UUID.randomUUID().toString()
    @Volatile private var inferenceScheduled=false
    private val executor=Executors.newSingleThreadExecutor()
    private val handler=Handler(Looper.getMainLooper())
    private var sensorManager:SensorManager?=null
    private var recorder:AudioRecord?=null
    private var expires=0L
    private var uid=""
    @Volatile private var motionAt:Long?=null
    @Volatile private var checkInUntil=0L
    private var spikes=0
    private var lastSpike=0L
    private val latency=java.util.ArrayDeque<Double>()
    private val consentPolling=AtomicBoolean(false)
    private var consentPollAt=0L
    @Volatile private var remoteConsent="CONFIRMED_AT_START"
    private var audioScore=0.0
    private var decision="NORMAL"
    private var windows=0
    private var audioManager:AudioManager?=null
    private var focus:AudioFocusRequest?=null
    private val guard=object:Runnable {override fun run(){
        if(!running.get())return
        val permission=ContextCompat.checkSelfPermission(this@AudioMonitoringService,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED
        if(!permission||!notificationsAllowed(this@AudioMonitoringService))finish("PERMISSION_REVOKED")
        else if(uid!=SafetyRuntime.auth.currentUser?.uid)finish("ACCOUNT_CHANGED")
        else if(SystemClock.elapsedRealtime()>=expires)finish("EXPIRED")
        else if(audioManager?.mode!=AudioManager.MODE_NORMAL)finish("CALL_OR_AUDIO_CONFLICT")
        else {
            if(SystemClock.elapsedRealtime()-consentPollAt>=5000&&consentPolling.compareAndSet(false,true)){
                consentPollAt=SystemClock.elapsedRealtime()
                SafetyRuntime.io.execute{try{
                    val profile=JSONObject(SafetyRuntime.request("/me","GET"))
                    if(running.get()&&!profile.getJSONObject("consents").optBoolean("monitoring"))finish("CONSENT_WITHDRAWN")
                    remoteConsent="CONFIRMED"
                }catch(e:Exception){remoteConsent="UNCONFIRMED_OFFLINE";if(running.get()&&e is HttpFailure&&e.status in listOf(401,403))finish("ACCOUNT_CHANGED")}
                finally{consentPolling.set(false)}}
            }
            publish();handler.postDelayed(this,500)
        }
    }}
    override fun onCreate(){super.onCreate();SafetyRuntime.setup(this)}
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
        if(intent?.action=="STOP"){finish("NOTIFICATION_STOP");return START_NOT_STICKY}
        if(running.get())return START_NOT_STICKY
        val config=synchronized(AudioMonitoringService::class.java){val value=pending;pending=null;if(value!=null){current=this;running.set(true)};value}
        if(config==null){stopSelf();return START_NOT_STICKY}
        uid=config.getString("uid");expires=config.getLong("expires_elapsed")
        if(uid!=SafetyRuntime.auth.currentUser?.uid||SystemClock.elapsedRealtime()>=expires){finish("EXPIRED");return START_NOT_STICKY}
        try{
            require(MicrophoneLease.acquire(leaseOwner)){"MICROPHONE_BUSY"}
            val manager=getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(NotificationChannel("audio_monitoring","Consented audio monitoring",NotificationManager.IMPORTANCE_LOW))
            require(notificationsAllowed(this)){"PERMISSION_UNAVAILABLE"}
            val open=PendingIntent.getActivity(this,4201,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)
            val stop=PendingIntent.getService(this,4202,Intent(this,AudioMonitoringService::class.java).setAction("STOP"),PendingIntent.FLAG_IMMUTABLE)
            val notification=NotificationCompat.Builder(this,"audio_monitoring").setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentTitle("SurakshaAI microphone monitoring")
                .setContentText("On-device sound check-ins. No automatic SOS. Tap Stop to end.").setContentIntent(open).addAction(android.R.drawable.ic_media_pause,"Stop",stop).setOngoing(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build()
            startForeground(4201,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
            current=this;running.set(true)
            sensorManager=getSystemService(SENSOR_SERVICE) as SensorManager
            val accelerometer=sensorManager!!.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            if(accelerometer!=null)sensorManager!!.registerListener(this,accelerometer,20000,handler)
            audioManager=getSystemService(AUDIO_SERVICE) as AudioManager
            val request=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION).build()).setOnAudioFocusChangeListener{change->if(change<0)finish("AUDIO_FOCUS_LOST")}.build()
            require(audioManager!!.requestAudioFocus(request)==AudioManager.AUDIOFOCUS_REQUEST_GRANTED){"AUDIO_FOCUS_UNAVAILABLE"};focus=request
            handler.post(guard);inferenceScheduled=true;executor.execute{infer()}
        }catch(_:Exception){if(running.get())finish("START_UNAVAILABLE")}
        return START_NOT_STICKY
    }
    private fun infer(){
        val pcm=ShortArray(15600)
        var model:YamnetClassifier?=null
        try{
            model=YamnetClassifier(this)
            val fusion= model.manifest.getJSONObject("fusion")
            val reducer=FusionDecision(fusion.getDouble("audio_high"),fusion.getDouble("audio_supported"),fusion.getLong("motion_window_ms"),fusion.getLong("confirmation_cooldown_ms"))
            val size=maxOf(62400,2*AudioRecord.getMinBufferSize(16000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT))
            require(running.get())
            val source=AudioRecord(MediaRecorder.AudioSource.MIC,16000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,size);recorder=source
            require(source.state==AudioRecord.STATE_INITIALIZED)
            val callback=object:AudioManager.AudioRecordingCallback(){override fun onRecordingConfigChanged(configs:MutableList<AudioRecordingConfiguration>){if(configs.any{it.clientAudioSessionId==source.audioSessionId&&it.isClientSilenced})finish("MICROPHONE_SILENCED")}}
            source.registerAudioRecordingCallback(mainExecutor,callback)
            require(running.get())
            source.startRecording()
            var filled=0
            while(running.get()){
                val n=source.read(pcm,filled,pcm.size-filled,AudioRecord.READ_NON_BLOCKING)
                if(n<0)throw IllegalStateException("AUDIO_READ_FAILED")
                if(n==0){Thread.sleep(20);continue};filled+=n
                if(filled==pcm.size){
                    val start=SystemClock.elapsedRealtimeNanos();val score=model.score(pcm);val elapsed=(SystemClock.elapsedRealtimeNanos()-start)/1e6
                    synchronized(latency){latency.add(elapsed);if(latency.size>120)latency.removeFirst()}
                    audioScore=score;windows++;decision=reducer.update(score,motionAt,SystemClock.elapsedRealtime())
                    if(decision!="NORMAL"){checkInUntil=SystemClock.elapsedRealtime()+15000;showCheckIn()}
                    // 50% overlap. Only this bounded in-memory window exists; no persistence/upload.
                    pcm.copyInto(pcm,0,7800,15600);pcm.fill(0,7800,15600);filled=7800;publish()
                }
            }
            source.unregisterAudioRecordingCallback(callback)
        }catch(_:Exception){if(running.get())finish("MODEL_OR_AUDIO_UNAVAILABLE")}
        finally{
            pcm.fill(0);runCatching{recorder?.stop()};runCatching{recorder?.release()};recorder=null;model?.close();MicrophoneLease.release(leaseOwner)
        }
    }
    private fun publish(){
        if(!running.get())return
        val measurements=synchronized(latency){latency.toList().sorted()}
        last=JSONObject().put("status",if(windows==0)"STARTING" else "ACTIVE_CONFIRMATION_ONLY").put("microphone",recorder?.recordingState==AudioRecord.RECORDSTATE_RECORDING).put("auto_dispatch",false)
            .put("remaining_seconds",((expires-SystemClock.elapsedRealtime())/1000).coerceAtLeast(0)).put("check_in",SystemClock.elapsedRealtime()<checkInUntil).put("decision",decision)
            .put("audio_score",audioScore).put("windows",windows).put("model_id","yamnet-classification-tflite-1").put("phrase_recognition",false).put("motion_available",sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)!=null)
            .put("remote_consent",remoteConsent)
            .put("inference_p95_ms",if(measurements.isEmpty())JSONObject.NULL else measurements[((measurements.size-1)*.95).toInt()]).put("native_pss_kb",Debug.getPss())
    }
    private fun showCheckIn(){
        val open=PendingIntent.getActivity(this,4203,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)
        getSystemService(NotificationManager::class.java).notify(4203,NotificationCompat.Builder(this,"audio_monitoring").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("Check in when you can")
            .setContentText("A sound pattern prompted a check-in. No SOS was sent.").setContentIntent(open).setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).build())
    }
    private fun finish(reason:String){
        running.set(false);handler.removeCallbacks(guard);sensorManager?.unregisterListener(this);sensorManager=null;runCatching{recorder?.stop()}
        if(!inferenceScheduled)MicrophoneLease.release(leaseOwner)
        focus?.let{audioManager?.abandonAudioFocusRequest(it)};focus=null;checkInUntil=0
        last=JSONObject(last.toString()).put("status",if(reason in listOf("USER_STOP","NOTIFICATION_STOP","EXPIRED","ACCOUNT_CHANGED"))"STOPPED" else "DEGRADED").put("reason",reason).put("microphone",false).put("auto_dispatch",false).put("check_in",false).put("remaining_seconds",0)
        getSystemService(NotificationManager::class.java).cancel(4203)
        if(current===this)current=null
        stopForeground(STOP_FOREGROUND_REMOVE);stopSelf()
    }
    override fun onSensorChanged(event:SensorEvent){
        if(!running.get())return;val now=SystemClock.elapsedRealtime();val g=sqrt(event.values.sumOf{(it*it).toDouble()})/9.80665
        if(g>2.7&&now-lastSpike>180){spikes=if(now-lastSpike<1800)spikes+1 else 1;lastSpike=now;if(spikes>=3){motionAt=now;spikes=0}}
    }
    override fun onAccuracyChanged(sensor:Sensor?,accuracy:Int){}
    override fun onBind(intent:Intent?)=null
    override fun onDestroy(){if(running.get())finish("SERVICE_STOPPED");executor.shutdown();super.onDestroy()}
}
