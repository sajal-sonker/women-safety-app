package com.surakshaai.triggers

import org.junit.Assert.*
import org.junit.Test

class PinPolicyTest {
    @Test fun differentSixToTwelveDigitPinsAreAccepted(){PinPolicy.validatePair("123456","987654321012")}
    @Test fun invalidInputExplainsFormatInsteadOfSuggestingNetworkFailure(){
        for(pin in listOf("1234","abcdef","1234567890123","")){
            try{PinPolicy.validate(pin);fail("Accepted malformed PIN")}catch(e:IllegalArgumentException){assertEquals("PIN_FORMAT",e.message)}
        }
    }
    @Test fun matchingPinsHaveADistinctError(){
        try{PinPolicy.validatePair("123456","123456");fail("Accepted identical PINs")}catch(e:IllegalArgumentException){assertEquals("PIN_MUST_DIFFER",e.message)}
    }
}
