package com.surakshaai

import com.facebook.react.bridge.*
import com.facebook.react.BaseReactPackage
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.google.android.gms.tasks.Tasks
import com.google.firebase.FirebaseException
import com.google.firebase.auth.*
import com.surakshaai.codegen.NativeSafetySpec
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.Executor
import java.util.concurrent.Executors

class NativeSafetyModule(context:ReactApplicationContext):NativeSafetySpec(context){
    private val controls=Executors.newSingleThreadExecutor()
    private val places=PlaceSearch(context)
    private val evidence=com.surakshaai.evidence.EvidenceCapture(context)
    override fun captureEvidence(eventId:String,kind:String,recipientIds:String,promise:Promise){evidence.capture(eventId,kind,recipientIds,promise)}
    override fun stopEvidenceCapture(promise:Promise){com.surakshaai.evidence.EvidenceCapture.recording=false;promise.resolve("{}")}
    companion object {const val NAME="NativeSafety"}
    init {
        SafetyRuntime.setup(context)
        SafetyRuntime.listener={value->
            val map=Arguments.createMap().apply {
                putString("client_request_id",value.optString("client_request_id"))
                putString("state",value.optString("state"))
                if(value.isNull("event_id"))putNull("event_id") else putString("event_id",value.getString("event_id"))
            };emitOnSafetyChange(map)
        }
    }
    override fun getName()=NAME
    override fun invalidate(){places.close();controls.shutdown();super.invalidate()}
    override fun searchPlaces(query:String,promise:Promise){places.search(query,promise)}
    override fun answerFakeCall(promise:Promise)=async(promise,controls){com.surakshaai.triggers.DiscreetControls.answer().toString()}
    private fun async(p:Promise,executor:Executor=SafetyRuntime.io,work:()->String){executor.execute{try{p.resolve(work())}catch(e:Exception){
        val allowed=setOf("MOTION_UNAVAILABLE","SENSOR_UNAVAILABLE","ALERT_NOTIFICATIONS_REQUIRED","RECENT_AUTH_REQUIRED","MICROPHONE_BUSY","PERMISSION_UNAVAILABLE","FOREGROUND_REQUIRED","CONSENT_REQUIRED","AUTO_DISPATCH_DISABLED","TRY_LATER","SETUP_REQUIRED")
        val code=if(e is HttpFailure)e.code else e.message?.takeIf{it in allowed}?:"ACTION_FAILED"
        val message=when(code){"MOTION_UNAVAILABLE","SENSOR_UNAVAILABLE"->"Motion sensing could not start. Stop voice listening first, then try again.";"ALERT_NOTIFICATIONS_REQUIRED"->"Turn on pop-up notifications for Voice check-in alerts in your phone settings before enabling repeated-word SOS.";"RECENT_AUTH_REQUIRED"->"Sign in again before changing PINs or requesting private account actions.";"MICROPHONE_BUSY"->"Stop the current microphone session before starting another capture.";"AUTO_DISPATCH_DISABLED"->"Automatic sensor dispatch is disabled. Use confirmation-only monitoring or manual SOS.";"TRY_LATER"->"Wait before trying the app PIN again.";"PERMISSION_UNAVAILABLE"->"Microphone and notification permissions are required for audio monitoring.";else->"Action could not complete. Check permissions and connection."}
        p.reject(code,message)
    }}}
    override fun initialize(config:String,promise:Promise)=async(promise){SafetyRuntime.initialize(config)}
    override fun getAuthState(promise:Promise)=async(promise,controls){SafetyRuntime.authState().toString()}
    override fun apiRequest(path:String,method:String,body:String,key:String,headers:String,promise:Promise)=async(promise){SafetyRuntime.request(path,method,body,key,JSONObject(headers))}
    override fun activateSos(trigger:String,promise:Promise)=async(promise,controls){SafetyRuntime.activate(trigger).toString()}
    override fun getIntent(clientRequestId:String,promise:Promise)=async(promise,controls){SafetyRuntime.state().optJSONObject("intent")?.takeIf{it.optString("client_request_id")==clientRequestId}?.toString()?:"{}"}
    override fun terminateIntent(clientRequestId:String,reason:String,promise:Promise)=async(promise){SafetyRuntime.terminate(clientRequestId,reason).toString()}
    override fun startLocation(purpose:String,resourceId:String,expiresAt:String,promise:Promise)=async(promise){SafetyRuntime.startLocation(purpose,resourceId,expiresAt).toString()}
    override fun stopLocation(purpose:String,resourceId:String,promise:Promise)=async(promise){SafetyRuntime.stopLocation(purpose,resourceId);"{}"}
    override fun getSafetyState(promise:Promise)=async(promise,controls){SafetyRuntime.state().toString()}
    override fun startMonitoring(config:String,promise:Promise)=async(promise,controls){val value=JSONObject(config);if(value.optString("mode")=="MOTION_ONLY_CONFIRMATION"){require(!com.surakshaai.monitoring.AudioMonitoringService.isActive()){"MICROPHONE_BUSY"};com.surakshaai.monitoring.MotionSession.start(value).toString()}else com.surakshaai.monitoring.AudioMonitoringService.start(value).toString()}
    override fun stopMonitoring(promise:Promise)=async(promise,controls){com.surakshaai.monitoring.AudioMonitoringService.stop();com.surakshaai.monitoring.MotionSession.stop();"{}"}
    override fun dismissMonitoringCheckIn(promise:Promise)=async(promise,controls){com.surakshaai.monitoring.AudioMonitoringService.dismissCheckIn();com.surakshaai.monitoring.MotionSession.dismissCheckIn();"{}"}
    override fun configurePins(normal:String,duress:String,promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.setup(normal,duress).toString()}
    override fun enterPin(pin:String,practice:Boolean,promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.unlock(pin,practice).toString()}
    override fun resetPins(promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.reset().toString()}
    override fun scheduleFakeCall(label:String,delaySeconds:Double,promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.schedule(label,delaySeconds.toInt()).toString()}
    override fun dismissFakeCall(promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.cancel();"{}"}
    override fun setFocusedKeys(enabled:Boolean,promise:Promise)=async(promise){require(!enabled||BuildConfig.CONTROLLED_DEMO);com.surakshaai.triggers.DiscreetControls.focusedKeys=enabled;"{}"}
    override fun finishAccountDeletion(jobId:String,promise:Promise)=async(promise){
        com.surakshaai.monitoring.AudioMonitoringService.stop("ACCOUNT_CHANGED");com.surakshaai.monitoring.MotionSession.stop()
        SafetyRuntime.locationPurposes.keys.toList().forEach{SafetyRuntime.stopLocation(it.substringBefore(':'),it.substringAfter(':'))}
        var complete=false
        repeat(15){if(!complete){val job=JSONObject(SafetyRuntime.request("/me/deletion/$jobId","GET"));if(job.optString("status")=="COMPLETED")complete=true else Thread.sleep(1000)}}
        if(!complete)throw HttpFailure(409,"DELETION_PENDING_RETRY")
        com.surakshaai.monitoring.AudioMonitoringService.stop("ACCOUNT_CHANGED");com.surakshaai.monitoring.MotionSession.stop();com.surakshaai.triggers.DiscreetControls.cancel()
        SafetyRuntime.locationPurposes.keys.toList().forEach{SafetyRuntime.stopLocation(it.substringBefore(':'),it.substringAfter(':'))}
        SafetyRuntime.store.write(JSONObject());SafetyRuntime.auth.signOut();"{}"
    }
    override fun clearAccount(promise:Promise)=async(promise){
        com.surakshaai.triggers.DiscreetControls.cancel()
        com.surakshaai.monitoring.AudioMonitoringService.stop("ACCOUNT_CHANGED");com.surakshaai.monitoring.MotionSession.stop()
        val current=SafetyRuntime.state().optJSONObject("intent")
        if(current!=null&&current.optString("state")!="TERMINATED")throw HttpFailure(409,"RESOLVE_ACTIVE_SOS_FIRST")
        val journeys=JSONObject(SafetyRuntime.request("/journeys?status=ACTIVE&status=OVERDUE","GET"))
        if(journeys.getJSONArray("items").length()>0)throw HttpFailure(409,"FINISH_ACTIVE_JOURNEY_FIRST")
        SafetyRuntime.locationPurposes.keys.toList().forEach {val p=it.substringBefore(':');val r=it.substringAfter(':');SafetyRuntime.stopLocation(p,r)}
        com.surakshaai.monitoring.AudioMonitoringService.stop("ACCOUNT_CHANGED");com.surakshaai.monitoring.MotionSession.stop()
        SafetyRuntime.store.update {it.remove("active");it.remove("verification_id")}
        SafetyRuntime.auth.signOut();"{}"
    }
    override fun startPhone(phone:String,promise:Promise) {
        val activity=reactApplicationContext.currentActivity
        if(activity==null){promise.reject("ACTIVITY_REQUIRED","Open the app to sign in.");return}
        activity.runOnUiThread {
            val options=PhoneAuthOptions.newBuilder(SafetyRuntime.auth).setPhoneNumber(phone)
                .setTimeout(60L,TimeUnit.SECONDS).setActivity(activity)
                .setCallbacks(object:PhoneAuthProvider.OnVerificationStateChangedCallbacks(){
                    override fun onVerificationCompleted(credential:PhoneAuthCredential){
                        SafetyRuntime.auth.signInWithCredential(credential).addOnCompleteListener { task->
                            if(task.isSuccessful)promise.resolve("{\"status\":\"VERIFIED\"}") else promise.reject("AUTH_FAILED","Phone verification failed.")
                        }
                    }
                    override fun onVerificationFailed(e:FirebaseException){promise.reject("AUTH_FAILED","Phone verification failed. Check the auth emulator or project setup.")}
                    override fun onCodeSent(verificationId:String,token:PhoneAuthProvider.ForceResendingToken){
                        SafetyRuntime.store.update { it.put("verification_id",verificationId) };promise.resolve("{\"status\":\"CODE_SENT\"}")
                    }
                }).build()
            PhoneAuthProvider.verifyPhoneNumber(options)
        }
    }
    override fun confirmPhone(code:String,promise:Promise)=async(promise){
        val credential=PhoneAuthProvider.getCredential(SafetyRuntime.store.read().getString("verification_id"),code)
        Tasks.await(SafetyRuntime.auth.signInWithCredential(credential),15,TimeUnit.SECONDS)
        SafetyRuntime.store.update {it.remove("verification_id")}
        SafetyRuntime.recover();SafetyRuntime.authState().toString()
    }
}
class SafetyPackage:BaseReactPackage(){
    override fun getModule(name:String,context:ReactApplicationContext):NativeModule? = if(name==NativeSafetyModule.NAME)NativeSafetyModule(context) else null
    override fun getReactModuleInfoProvider()=ReactModuleInfoProvider {
        mapOf(NativeSafetyModule.NAME to ReactModuleInfo(NativeSafetyModule.NAME,NativeSafetyModule.NAME,false,false,false,true))
    }
}
