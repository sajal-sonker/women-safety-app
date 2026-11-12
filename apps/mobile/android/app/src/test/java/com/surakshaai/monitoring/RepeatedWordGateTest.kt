package com.surakshaai.monitoring
import org.junit.Assert.*
import org.junit.Test

class RepeatedWordGateTest {
    private fun hit(i:Int,label:String="HELP")=PhraseHit(label,.95,i*1000L+100,i*1000L+500)
    @Test fun disabledNeverArms(){val g=RepeatedWordGate(false);repeat(8){g.add(hit(it),10000,10000)};assertEquals(0,g.count(10000));assertFalse(g.takeDispatch(99999))}
    @Test fun fiveMixedWordsArmTenSecondCountdownAndDispatchOnce(){val g=RepeatedWordGate(true);repeat(4){g.add(hit(it),10000,10000)};assertEquals(0,g.deadline);g.add(hit(4,"BACHAO"),10000,10000);assertEquals(20000,g.deadline);assertFalse(g.takeDispatch(19999));assertTrue(g.takeDispatch(20000));assertFalse(g.takeDispatch(20001));repeat(8){g.add(hit(it+10),30000,30000)};assertFalse(g.takeDispatch(99999))}
    @Test fun oldWordsOutsideWindowDoNotAccumulate(){val g=RepeatedWordGate(true);repeat(4){g.add(hit(it),5000,5000)};g.add(hit(40),41000,41000);assertEquals(1,g.count(41000));assertEquals(0,g.deadline)}
    @Test fun duplicateResultsAndBilingualOverlapCountOnlyOnce(){val g=RepeatedWordGate(true);repeat(10){g.add(hit(1),5000,5000);g.add(PhraseHit("BACHAO",.99,1150,1550),5000,5000)};assertEquals(1,g.count(5000));assertEquals(0,g.deadline)}
    @Test fun cancelClearsCountdownAndIgnoresTrailingResults(){val g=RepeatedWordGate(true);repeat(5){g.add(hit(it),5000,5000)};g.cancel(6000);repeat(5){g.add(hit(it+5),10000,10000)};assertFalse(g.takeDispatch(20000));assertEquals(0,g.count(10000));repeat(5){g.add(hit(it+40),45000,45000)};assertTrue(g.takeDispatch(55000))}
    @Test fun invalidLowConfidenceAndFutureHitsCannotCount(){val g=RepeatedWordGate(true);for(h in listOf(hit(0).copy(confidence=.74),hit(1).copy(label="OTHER"),hit(2).copy(endMs=2101),hit(9)))g.add(h,3000,3000);assertEquals(0,g.count(3000))}
    @Test fun repeatedWordsInOneFinalResultArePreserved(){val json="""{"result":[{"word":"help","conf":0.9,"start":0.1,"end":0.5},{"word":"help","conf":0.9,"start":1.1,"end":1.5},{"word":"help","conf":0.9,"start":2.1,"end":2.5},{"word":"help","conf":0.9,"start":3.1,"end":3.5},{"word":"help","conf":0.9,"start":4.1,"end":4.5}]}""";val words=PhrasePolicy.finalizedWords("en",json);assertEquals(5,words.size);val g=RepeatedWordGate(true);words.forEach{g.add(it,5000,5000)};assertEquals(15000,g.deadline)}
}
