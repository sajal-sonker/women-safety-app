package com.surakshaai.location

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.*
import android.os.*
import androidx.core.app.NotificationCompat
import com.surakshaai.MainActivity
import com.surakshaai.SafetyRuntime
import com.surakshaai.HttpFailure
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class SafetyLocationService: Service(), LocationListener {
    companion object { @Volatile var status="STOPPED"; @Volatile var current:SafetyLocationService?=null }
    private val purposes=mutableMapOf<String,Pair<String,Long>>()
    private lateinit var manager: LocationManager
    private val handler=Handler(Looper.getMainLooper())
    private var listening=false
    private var lastFixElapsed=0L
    private val inFlight=ConcurrentHashMap<String,Boolean>()
    private val expiry=object: Runnable { override fun run(){
        purposes.entries.removeAll{it.value.second<=SystemClock.elapsedRealtime()||!SafetyRuntime.locationPurposes.containsKey(it.key)}
        SafetyRuntime.locationPurposes.entries.removeAll{it.value.second<=SystemClock.elapsedRealtime()}
        if(purposes.isEmpty()&&SafetyRuntime.locationPurposes.isEmpty()){stopSelf();return};handler.postDelayed(this,1000)
    }}
    override fun onCreate(){
        super.onCreate();SafetyRuntime.setup(this);current=this
        manager=getSystemService(LOCATION_SERVICE) as LocationManager
        val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(NotificationChannel("safety_location","Active safety location",NotificationManager.IMPORTANCE_LOW))
        val open=PendingIntent.getActivity(this,0,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)
        val notification=NotificationCompat.Builder(this,"safety_location").setContentTitle("SurakshaAI location sharing")
            .setContentText("Active SOS or journey. Open the app to stop sharing.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation).setContentIntent(open).setOngoing(true).build()
        startForeground(4101,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        handler.post(expiry)
    }
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
        if(intent==null){stopSelf();return START_NOT_STICKY}
        val purpose=intent.getStringExtra("purpose")?:""
        val resource=intent.getStringExtra("resource")?:""
        val key="$purpose:$resource"
        val allowed=SafetyRuntime.locationPurposes[key]
        if(allowed!=null&&allowed.second>SystemClock.elapsedRealtime()){
            purposes[key]=allowed
            if(!listening)try{
                for(provider in manager.getProviders(true))if(provider==LocationManager.GPS_PROVIDER||provider==LocationManager.NETWORK_PROVIDER)
                    manager.requestLocationUpdates(provider,15000L,10f,this)
                listening=true;status="ACTIVE"
            }catch(_:SecurityException){status="PERMISSION_UNAVAILABLE";stopSelf()}
        }
        if(purposes.isEmpty())stopSelf()
        return START_NOT_STICKY
    }
    fun removePurpose(key:String){handler.post {purposes.remove(key);if(purposes.isEmpty())stopSelf()}}
    override fun onLocationChanged(location:Location){
        if(SystemClock.elapsedRealtime()-lastFixElapsed<15000)return
        lastFixElapsed=SystemClock.elapsedRealtime()
        for((key,value)in purposes.toMap()){
            val purpose=key.substringBefore(':')
            if(purpose=="PENDING")continue
            if(inFlight.putIfAbsent(key,true)!=null)continue
            val body=JSONObject().put("sample_id",UUID.randomUUID().toString()).put("location",SafetyRuntime.locationJson(location))
            SafetyRuntime.io.execute {
                if(!SafetyRuntime.locationPurposes.containsKey(key)){inFlight.remove(key);return@execute}
                try {SafetyRuntime.request("/"+(if(purpose=="SOS")"sos" else "journeys")+"/"+value.first+"/locations","POST",body.toString())}
                catch(error:Exception){
                    if(error is HttpFailure&&(error.status in listOf(403,404,410)||error.code=="INVALID_TRANSITION")){
                        SafetyRuntime.stopLocation(purpose,value.first)
                    }else if(current===this)status="DEGRADED"
                }
                finally{inFlight.remove(key)}
            }
        }
    }
    override fun onBind(intent:Intent?)=null
    override fun onDestroy(){
        handler.removeCallbacksAndMessages(null)
        runCatching {manager.removeUpdates(this)}
        purposes.keys.forEach{SafetyRuntime.locationPurposes.remove(it)}
        purposes.clear();current=null;status="STOPPED";super.onDestroy()
    }
}
