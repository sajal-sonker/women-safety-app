package com.surakshaai.triggers

// Activity-scoped physical taps only; never installs a global key listener.
class FocusedKeySequence(private val windowMs:Long=5000,private val cooldownMs:Long=5000){
    private val keys=mutableListOf<Pair<Int,Long>>()
    private var lastTrigger:Long?=null
    val progress:Int get()=keys.size
    @Synchronized fun reset(){keys.clear()}
    @Synchronized fun accept(code:Int,repeat:Int,now:Long):Boolean {
        if(code !in listOf(24,25)||repeat!=0)return false
        if(keys.lastOrNull()?.second?.let{now<it}==true)keys.clear()
        keys.removeAll{now-it.second>windowMs}
        keys.add(code to now);if(keys.size>4)keys.removeAt(0)
        if(keys.map{it.first}!=listOf(24,25,24,25))return false
        keys.clear()
        if(lastTrigger?.let{now>=it&&now-it<cooldownMs}==true)return false
        lastTrigger=now;return true
    }
}
