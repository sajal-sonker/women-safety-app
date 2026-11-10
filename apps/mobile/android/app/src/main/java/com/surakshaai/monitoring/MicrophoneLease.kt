package com.surakshaai.monitoring

// Exactly one explicit microphone purpose; inference buffers never become evidence.
object MicrophoneLease {
    private var owner:String?=null
    @Synchronized fun acquire(purpose:String):Boolean {if(owner!=null)return false;owner=purpose;return true}
    @Synchronized fun release(purpose:String){if(owner==purpose)owner=null}
    @Synchronized fun isFree()=owner==null
}
