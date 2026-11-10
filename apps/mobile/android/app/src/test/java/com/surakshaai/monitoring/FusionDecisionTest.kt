package com.surakshaai.monitoring
import org.junit.Assert.*
import org.junit.Test
class FusionDecisionTest {
    @Test fun strongAudioDoesNotRequireMotion(){assertEquals("AUDIO_CHECK_IN",FusionDecision().update(.8,null,0))}
    @Test fun moderateAudioNeedsRecentMotion(){assertEquals("NORMAL",FusionDecision().update(.4,null,5000));assertEquals("AUDIO_MOTION_CHECK_IN",FusionDecision().update(.4,2000,5000));assertEquals("NORMAL",FusionDecision().update(.4,1999,5000))}
    @Test fun ordinaryMotionCannotDispatchOrCreateAnAudioCheckIn(){assertEquals("NORMAL",FusionDecision().update(.1,1000,1000))}
    @Test fun onePromptPerCooldown(){val r=FusionDecision();assertEquals("AUDIO_CHECK_IN",r.update(.9,null,100));assertEquals("NORMAL",r.update(.9,null,120099));assertEquals("AUDIO_CHECK_IN",r.update(.9,null,120100))}
    @Test(expected=IllegalArgumentException::class) fun invalidScoreFailsClosed(){FusionDecision().update(Double.NaN,null,1)}
}
