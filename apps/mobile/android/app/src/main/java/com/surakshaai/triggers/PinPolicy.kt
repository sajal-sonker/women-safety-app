package com.surakshaai.triggers

object PinPolicy {
    fun validate(pin:String){require(pin.matches(Regex("[0-9]{6,12}"))){"PIN_FORMAT"}}
    fun validatePair(normal:String,duress:String){
        validate(normal);validate(duress)
        require(normal!=duress){"PIN_MUST_DIFFER"}
    }
}
