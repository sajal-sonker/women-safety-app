package com.surakshaai.monitoring

import kotlin.math.exp
import kotlin.math.sqrt

// Deliberate-shake heuristic only. No Android, microphone or SOS dependency.
class ShakeDetector(sensitivity:String="STANDARD") {
    private val threshold=when(sensitivity){"STANDARD"->.9*9.80665;"SENSITIVE"->.55*9.80665;else->throw IllegalArgumentException("Unknown sensitivity")}
    private var gravity:DoubleArray?=null
    private var firstAt=0L
    private var lastAt=0L
    private var impulseAt:Long?=null
    private var seriesAt:Long?=null
    private var direction:DoubleArray?=null
    private var nextAllowed=0L
    var progress=0;private set
    val ready:Boolean get()=gravity!=null&&lastAt-firstAt>=800
    fun accept(x:Double,y:Double,z:Double,now:Long):Boolean {
        val sample=doubleArrayOf(x,y,z)
        if(now<0||sample.any{!it.isFinite()||kotlin.math.abs(it)>400})return false
        val g=gravity
        if(g==null){gravity=sample.copyOf();firstAt=now;lastAt=now;return false}
        if(now<=lastAt)return false
        val dt=now-lastAt;lastAt=now
        if(dt>2000){gravity=sample.copyOf();firstAt=now;progress=0;direction=null;impulseAt=null;seriesAt=null;return false}
        val alpha=exp(-dt.toDouble()/600.0)
        for(i in 0..2)g[i]=alpha*g[i]+(1-alpha)*sample[i]
        if(!ready||now<nextAllowed)return false
        val linear=DoubleArray(3){sample[it]-g[it]}
        val magnitude=sqrt(linear.sumOf{it*it})
        if(seriesAt!=null&&now-seriesAt!!>2000){progress=0;direction=null;impulseAt=null;seriesAt=null}
        if(magnitude<threshold)return false
        val normal=DoubleArray(3){linear[it]/magnitude}
        val previous=direction
        if(previous!=null&&(now-(impulseAt?:now)<140||normal.indices.sumOf{normal[it]*previous[it]}>-.25))return false
        if(progress==0)seriesAt=now
        direction=normal;impulseAt=now;progress++
        if(progress<3)return false
        progress=0;direction=null;impulseAt=null;seriesAt=null;nextAllowed=now+10000
        return true
    }
    fun dismiss(now:Long){progress=0;direction=null;impulseAt=null;seriesAt=null;nextAllowed=now+2000}
}
