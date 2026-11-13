package com.surakshaai

import org.junit.Assert.*
import org.junit.Test

class NetworkEndpointPolicyTest {
    @Test fun hostedEndpointRequiresCleanHttpsOrigin(){
        assertTrue(NetworkEndpointPolicy.allowed("https://api.example.test",false))
        for(value in listOf("http://api.example.test","https://user:pass@api.example.test","https://api.example.test?token=x","https://api.example.test/path","https://api.example.test#x","not a URL"))assertFalse(value,NetworkEndpointPolicy.allowed(value,false))
    }
    @Test fun emulatorHttpNeverBecomesAnUnrestrictedPublicFallback(){
        assertTrue(NetworkEndpointPolicy.allowed("http://127.0.0.1:4001",true))
        assertTrue(NetworkEndpointPolicy.allowed("http://10.0.2.2:4001",true))
        assertFalse(NetworkEndpointPolicy.allowed("http://127.0.0.1:4001",false))
        assertFalse(NetworkEndpointPolicy.allowed("http://example.test:4001",true))
    }
}
