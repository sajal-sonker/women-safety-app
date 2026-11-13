package com.surakshaai.triggers

import org.junit.Assert.*
import org.junit.Test

class FocusedKeySequenceTest {
    @Test fun fourSeparateTapsFitAUsableFiveSecondWindow(){
        val sequence=FocusedKeySequence()
        assertFalse(sequence.accept(24,0,1000));assertFalse(sequence.accept(25,0,2200))
        assertFalse(sequence.accept(24,0,3400));assertTrue(sequence.accept(25,0,4600))
        assertEquals(0,sequence.progress)
    }
    @Test fun holdsAndUnrelatedKeysCannotCompleteAnIntentionalSequence(){
        val sequence=FocusedKeySequence()
        assertFalse(sequence.accept(24,0,1000));assertFalse(sequence.accept(25,1,1100))
        assertFalse(sequence.accept(24,1,1200));assertFalse(sequence.accept(25,1,1300))
        assertFalse(sequence.accept(66,0,1400));assertEquals(1,sequence.progress)
    }
    @Test fun leavingTheActivityResetsPartialInput(){
        val sequence=FocusedKeySequence();sequence.accept(24,0,1000);sequence.accept(25,0,1200)
        sequence.reset();assertFalse(sequence.accept(24,0,1400));assertFalse(sequence.accept(25,0,1600))
    }
    @Test fun slowSequenceExpiresAndAnotherDeliberateSequenceCanWorkAfterCooldown(){
        val sequence=FocusedKeySequence();sequence.accept(24,0,0);sequence.accept(25,0,1000)
        sequence.accept(24,0,2000);assertFalse(sequence.accept(25,0,6000))
        for((i,key) in listOf(24,25,24).withIndex())assertFalse(sequence.accept(key,0,10000+i*300L))
        assertTrue(sequence.accept(25,0,11000))
        for((i,key) in listOf(24,25,24).withIndex())assertFalse(sequence.accept(key,0,17000+i*300L))
        assertTrue(sequence.accept(25,0,18000))
    }
}
