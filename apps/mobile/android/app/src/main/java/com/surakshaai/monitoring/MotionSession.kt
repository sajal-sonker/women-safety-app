package com.surakshaai.monitoring

import android.content.Context
import android.hardware.*
import android.os.*
import com.surakshaai.*
import com.surakshaai.triggers.DiscreetControls
import org.json.JSONObject

// Foreground-only consented session. Main owns lifecycle; bridge reads snapshot.
object MotionSession:SensorEventListener {
    private var manager:SensorManager?=null
    private var until=0L
    private var uid:String?=null
    private var detector=ShakeDetector()
    private var checkInUntil=0L
    private var status="STOPPED"
    private var startedAt=0L
    private var reason:String?=null
    private val handler=Handler(Looper.getMainLooper())
    private val generation=java.util.concurrent.atomic.AtomicLong()
    @Volatile private var snapshot=JSONObject().put("status","STOPPED").put("microphone",false).put("auto_dispatch",false).put("check_in",false).put("remaining_seconds",0).toString()
    private fun onMain(work:()->Unit){
        if(Looper.myLooper()==Looper.getMainLooper()){work();return}
        val task=java.util.concurrent.FutureTask<Unit>{work()};handler.post(task)
        try{task.get(2,java.util.concurrent.TimeUnit.SECONDS)}catch(e:Exception){throw IllegalStateException("MOTION_UNAVAILABLE",e)}
    }
    fun start(config:JSONObject):JSONObject {
        require(DiscreetControls.visible&&SafetyRuntime.auth.currentUser!=null){"FOREGROUND_REQUIRED"}
        require(config.optString("mode")=="MOTION_ONLY_CONFIRMATION"&&config.optString("consent_version")=="consent-v1"&&config.optBoolean("motion_consent")){"CONSENT_REQUIRED"}
        val minutes=config.optInt("duration_minutes",30);require(minutes in 1..120)
        val next=ShakeDetector(config.optString("motion_sensitivity","STANDARD"))
        val token=generation.incrementAndGet();val expectedUid=SafetyRuntime.auth.currentUser!!.uid
        try{onMain {
            if(generation.get()!=token)return@onMain
            stopInternal();require(DiscreetControls.visible){"FOREGROUND_REQUIRED"}
            require(SafetyRuntime.auth.currentUser?.uid==expectedUid){"FOREGROUND_REQUIRED"}
            manager=SafetyRuntime.context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            val sensor=manager!!.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?:throw IllegalStateException("SENSOR_UNAVAILABLE")
            startedAt=SystemClock.elapsedRealtime();until=startedAt+minutes*60000L;uid=SafetyRuntime.auth.currentUser?.uid;detector=next;status="MOTION_PREPARING"
            if(!manager!!.registerListener(this,sensor,20000,handler)){stopInternal();throw IllegalStateException("SENSOR_UNAVAILABLE")}
            if(generation.get()!=token){stopInternal();return@onMain}
            publish();handler.post(tick)
        }}catch(e:Exception){generation.compareAndSet(token,token+1);throw e}
        return state()
    }
    private val tick=object:Runnable {override fun run(){
        if(status=="STOPPED")return
        if(!DiscreetControls.visible||SystemClock.elapsedRealtime()>=until||uid!=SafetyRuntime.auth.currentUser?.uid){stopInternal();return}
        if(!detector.ready&&SystemClock.elapsedRealtime()-startedAt>5000){stopInternal("MOTION_SENSOR_NOT_RESPONDING");return}
        publish();handler.postDelayed(this,500)
    }}
    private fun publish(){snapshot=JSONObject().put("status",status).put("reason",reason?:JSONObject.NULL).put("microphone",false).put("auto_dispatch",false).put("check_in",SystemClock.elapsedRealtime()<checkInUntil).put("decision","MOTION_CHECK_IN").put("motion_ready",detector.ready).put("motion_progress",detector.progress).put("remaining_seconds",((until-SystemClock.elapsedRealtime())/1000).coerceAtLeast(0)).toString()}
    private fun stopInternal(failure:String?=null){manager?.unregisterListener(this);manager=null;handler.removeCallbacks(tick);reason=failure;status=if(failure==null)"STOPPED" else "DEGRADED";until=0;checkInUntil=0;uid=null;detector=ShakeDetector();publish()}
    fun stop(){generation.incrementAndGet();onMain{stopInternal()}}
    fun dismissCheckIn(){onMain{checkInUntil=0;detector.dismiss(SystemClock.elapsedRealtime());publish()}}
    override fun onSensorChanged(event:SensorEvent){
        if((status!="MOTION_PREPARING"&&status!="MOTION_ONLY_FOREGROUND")||event.sensor.type!=Sensor.TYPE_ACCELEROMETER||event.values.size<3)return
        if(!DiscreetControls.visible||uid!=SafetyRuntime.auth.currentUser?.uid){stopInternal();return}
        val now=SystemClock.elapsedRealtime()
        if(detector.accept(event.values[0].toDouble(),event.values[1].toDouble(),event.values[2].toDouble(),now))checkInUntil=now+15000
        if(detector.ready)status="MOTION_ONLY_FOREGROUND"
    }
    override fun onAccuracyChanged(sensor:Sensor?,accuracy:Int){}
    fun state()=JSONObject(snapshot)
}
