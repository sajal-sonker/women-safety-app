package com.surakshaai.monitoring
import org.junit.Assert.*
import org.junit.Test
import kotlin.math.sin

class ShakeDetectorTest {
    private fun warm(d:ShakeDetector){for(t in 0L..1000L step 20)assertFalse(d.accept(0.0,0.0,9.80665,t));assertTrue(d.ready)}
    @Test fun threeDeliberateAlternationsTriggerBelowOldTwoPointSevenGThreshold(){val d=ShakeDetector();warm(d);assertFalse(d.accept(12.0,0.0,9.80665,1100));assertFalse(d.accept(-12.0,0.0,9.80665,1300));assertTrue(d.accept(12.0,0.0,9.80665,1500))}
    @Test fun stationaryWalkingAndSensorNoiseStayQuiet(){val d=ShakeDetector();for(t in 0L..60000 step 20){val n=sin(t/100.0)*1.7;assertFalse(d.accept(n,n*.5,9.80665+n*.4,t))}}
    @Test fun oneBumpAndSustainedAccelerationAreNotThreeShakes(){val d=ShakeDetector();warm(d);for(t in 1100L..1800L step 20)assertFalse(d.accept(12.0,0.0,9.80665,t));for(t in 1820L..3000L step 20)assertFalse(d.accept(0.0,0.0,9.80665,t))}
    @Test fun impulsesMustFitWithinTwoSeconds(){val d=ShakeDetector();warm(d);assertFalse(d.accept(12.0,0.0,9.80665,1100));assertFalse(d.accept(-12.0,0.0,9.80665,2600));assertFalse(d.accept(12.0,0.0,9.80665,4100))}
    @Test fun duplicateOrTooFastEventsDoNotCountTwice(){val d=ShakeDetector();warm(d);assertFalse(d.accept(12.0,0.0,9.80665,1100));assertFalse(d.accept(-12.0,0.0,9.80665,1100));assertFalse(d.accept(-12.0,0.0,9.80665,1150));assertEquals(1,d.progress)}
    @Test fun responsiveSettingRecognizesLighterDeliberateShakes(){val standard=ShakeDetector();val sensitive=ShakeDetector("SENSITIVE");warm(standard);warm(sensitive);var standardPrompt=false;var sensitivePrompt=false;for((i,x)in listOf(7.0,-7.0,7.0).withIndex()){standardPrompt=standard.accept(x,0.0,9.80665,1100L+i*200)||standardPrompt;sensitivePrompt=sensitive.accept(x,0.0,9.80665,1100L+i*200)||sensitivePrompt};assertFalse(standardPrompt);assertTrue(sensitivePrompt)}
    @Test fun dismissalAndCooldownSuppressTrailingShakes(){val d=ShakeDetector();warm(d);for((i,x)in listOf(12.0,-12.0,12.0).withIndex())d.accept(x,0.0,9.80665,1100L+i*200);for(t in 1600L..3000 step 200)assertFalse(d.accept(if(t%400==0L)12.0 else -12.0,0.0,9.80665,t));d.dismiss(3100);assertFalse(d.accept(12.0,0.0,9.80665,3200));assertEquals(0,d.progress)}
    @Test fun invalidSamplesAndRestartNeedFreshWarmup(){val d=ShakeDetector();assertFalse(d.accept(Double.NaN,0.0,9.8,0));assertFalse(d.ready);warm(d);assertFalse(d.accept(9999.0,0.0,9.8,1200));val fresh=ShakeDetector();assertFalse(fresh.ready);assertFalse(fresh.accept(12.0,0.0,9.8,2000))}
}
