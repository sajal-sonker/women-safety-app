package com.surakshaai

import java.io.IOException
import org.junit.Assert.*
import org.junit.Test

class NativeFailureTest {
    @Test fun localPinAndRecentAuthErrorsNeverBecomeConnectionOrMicrophoneErrors(){
        for(code in listOf("PIN_FORMAT","PIN_MUST_DIFFER","RECENT_AUTH_REQUIRED","SETUP_REQUIRED")){
            assertEquals(code,NativeFailure.code(IllegalArgumentException(code)))
            assertFalse(NativeFailure.message(code).contains("connection",true))
            assertFalse(NativeFailure.message(code).contains("microphone",true))
        }
    }
    @Test fun actualNetworkFailureHasAnActionableConnectionMessage(){
        assertEquals("NETWORK_UNAVAILABLE",NativeFailure.code(IOException("private diagnostic")))
        assertFalse(NativeFailure.message("NETWORK_UNAVAILABLE").contains("private diagnostic"))
    }
}
