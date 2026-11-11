package com.surakshaai.monitoring

import android.content.Context
import android.hardware.*
import android.os.*
import com.surakshaai.*
import com.surakshaai.triggers.DiscreetControls
import org.json.JSONObject
import kotlin.math.sqrt

// Motion-only foreground experiment. No microphone or automatic SOS without a graduated model.
object MotionSession:SensorEventListener {
    private var manager:SensorManager?=null
    private var until=0L
    private var uid:String?=null
    private var spikes=0
    private var lastSpike=0L
    private var checkInUntil=0L
    private var status="STOPPED"
    private val handler=Handler(Looper.getMainLooper())
    fun start(config:JSONObject):JSONObject {
        require(DiscreetControls.visible&&SafetyRuntime.auth.currentUser!=null)
        require(config.optString("mode")=="MOTION_ONLY_CONFIRMATION"&&config.optString("consent_version")=="consent-v1"&&config.optBoolean("motion_consent")) {"MODEL_NOT_VALIDATED"}
        val minutes=config.optInt("duration_minutes",30);require(minutes in 1..120);stop()
        manager=SafetyRuntime.context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val sensor=manager!!.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?:throw HttpFailure(422,"SENSOR_UNAVAILABLE")
        until=SystemClock.elapsedRealtime()+minutes*60000L;uid=SafetyRuntime.auth.currentUser!!.uid;status="MOTION_ONLY_FOREGROUND"
        if(!manager!!.registerListener(this,sensor,20000,handler)){stop();throw HttpFailure(422,"SENSOR_UNAVAILABLE")}
        handler.post(tick);return state()
    }
    private val tick=object:Runnable {override fun run(){if(!DiscreetControls.visible||SystemClock.elapsedRealtime()>=until||uid!=SafetyRuntime.auth.currentUser?.uid){stop();return};handler.postDelayed(this,500)}}
    fun stop(){manager?.unregisterListener(this);manager=null;handler.removeCallbacks(tick);status="STOPPED";until=0;spikes=0;checkInUntil=0;uid=null}
    fun dismissCheckIn(){checkInUntil=0}
    override fun onSensorChanged(event:SensorEvent){
        if(status=="STOPPED")return
        val now=SystemClock.elapsedRealtime();val g=sqrt(event.values.sumOf{(it*it).toDouble()})/9.80665
        if(g>2.7&&now-lastSpike>180){spikes=if(now-lastSpike<1800)spikes+1 else 1;lastSpike=now;if(spikes>=3){checkInUntil=now+15000;spikes=0}}
    }
    override fun onAccuracyChanged(sensor:Sensor?,accuracy:Int){}
    fun state()=JSONObject().put("status",status).put("microphone",false).put("auto_dispatch",false).put("check_in",SystemClock.elapsedRealtime()<checkInUntil).put("remaining_seconds",((until-SystemClock.elapsedRealtime())/1000).coerceAtLeast(0))
}
