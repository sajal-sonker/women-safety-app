package com.surakshaai

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  override fun onResume(){
    super.onResume();com.surakshaai.triggers.DiscreetControls.visible=true
    SafetyRuntime.io.execute{runCatching{SafetyRuntime.setup(applicationContext);if(com.surakshaai.triggers.DiscreetControls.visible)com.surakshaai.triggers.DiscreetControls.ring()}}
  }
  override fun onPause(){com.surakshaai.triggers.DiscreetControls.visible=false;com.surakshaai.triggers.DiscreetControls.stopSound();com.surakshaai.monitoring.MotionSession.stop();com.surakshaai.evidence.EvidenceCapture.recording=false;super.onPause()}
  override fun dispatchKeyEvent(event:android.view.KeyEvent):Boolean {
    if(event.action==android.view.KeyEvent.ACTION_DOWN)com.surakshaai.triggers.DiscreetControls.onKey(event.keyCode,event.repeatCount)
    return super.dispatchKeyEvent(event)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SurakshaAI"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
