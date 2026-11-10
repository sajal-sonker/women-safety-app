package com.surakshaai.monitoring

// Pure native reducer: one check-in per episode/cooldown; never sends an SOS.
class FusionDecision(private val high:Double=.65,private val supported:Double=.35,private val windowMs:Long=3000,private val cooldownMs:Long=120000){
    private var lastPrompt:Long?=null
    fun update(audio:Double,motionAt:Long?,now:Long):String {
        require(audio.isFinite()&&audio in 0.0..1.0&&now>=0)
        val recent=motionAt!=null&&now>=motionAt&&now-motionAt<=windowMs
        val candidate=audio>=high||(audio>=supported&&recent)
        val previous=lastPrompt
        if(candidate&&(previous==null||now-previous>=cooldownMs)){lastPrompt=now;return if(recent)"AUDIO_MOTION_CHECK_IN" else "AUDIO_CHECK_IN"}
        return "NORMAL"
    }
}
