package com.surakshaai

import com.surakshaai.monitoring.PhraseHit
import com.surakshaai.monitoring.RepeatedWordGate
import org.junit.Assert.*
import org.junit.Test

class SosTriggerPolicyTest {
    @Test fun completedConsentedCountdownCanReachTheActualNativeTriggerPolicy(){
        val gate=RepeatedWordGate(true)
        repeat(5){gate.add(PhraseHit("HELP",.95,it*1000L+100,it*1000L+500),5000,5000)}
        assertTrue(gate.takeDispatch(15000))
        assertTrue(SosTriggerPolicy.allowed("ML_FUSION",true,true))
        assertFalse(gate.takeDispatch(16000))
    }
    @Test fun arbitraryBridgeRequestsCannotBypassAutomaticSessionAuthorization(){
        assertFalse(SosTriggerPolicy.allowed("ML_FUSION",true,false))
        assertFalse(SosTriggerPolicy.allowed("ML_FUSION",false,true))
        assertFalse(SosTriggerPolicy.allowed("JOURNEY_OVERDUE",true,true))
        assertTrue(SosTriggerPolicy.allowed("MANUAL",false,false))
        assertTrue(SosTriggerPolicy.allowed("DURESS_PIN",true,false))
        assertTrue(SosTriggerPolicy.allowed("VOLUME_CODE",true,false))
    }
}
