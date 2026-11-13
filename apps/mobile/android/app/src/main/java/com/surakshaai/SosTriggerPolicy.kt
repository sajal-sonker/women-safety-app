package com.surakshaai

object SosTriggerPolicy {
    fun allowed(trigger:String,controlledDemo:Boolean,automaticSessionAuthorized:Boolean):Boolean =
        trigger in setOf("MANUAL","DURESS_PIN") || (controlledDemo && trigger=="VOLUME_CODE") ||
        (trigger=="ML_FUSION" && controlledDemo && automaticSessionAuthorized)
}
