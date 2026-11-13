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
    @Volatile private var authSequence=0
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
        val code=NativeFailure.code(e)
        p.reject(code,NativeFailure.message(code))
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
    override fun openVoiceNotificationSettings(promise:Promise){
        val activity=reactApplicationContext.currentActivity
        if(activity==null){promise.reject("FOREGROUND_REQUIRED",NativeFailure.message("FOREGROUND_REQUIRED"));return}
        activity.runOnUiThread{
            try{
                com.surakshaai.monitoring.CheckInAlerts.channel(activity)
                activity.startActivity(android.content.Intent(android.provider.Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                    .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,activity.packageName)
                    .putExtra(android.provider.Settings.EXTRA_CHANNEL_ID,com.surakshaai.monitoring.CheckInAlerts.CHANNEL))
                promise.resolve("{}")
            }catch(_:Exception){promise.reject("ACTION_FAILED","Open your phone settings and allow Voice check-in alert notifications.")}
        }
    }
    override fun dismissMonitoringCheckIn(promise:Promise)=async(promise,controls){com.surakshaai.monitoring.AudioMonitoringService.dismissCheckIn();com.surakshaai.monitoring.MotionSession.dismissCheckIn();"{}"}
    override fun configurePins(normal:String,duress:String,promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.setup(normal,duress).toString()}
    override fun enterPin(pin:String,practice:Boolean,promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.unlock(pin,practice).toString()}
    override fun resetPins(promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.reset().toString()}
    override fun scheduleFakeCall(label:String,delaySeconds:Double,promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.schedule(label,delaySeconds.toInt()).toString()}
    override fun dismissFakeCall(promise:Promise)=async(promise){com.surakshaai.triggers.DiscreetControls.cancel();"{}"}
    override fun setFocusedKeys(enabled:Boolean,promise:Promise)=async(promise,controls){com.surakshaai.triggers.DiscreetControls.setFocusedKeys(enabled);com.surakshaai.triggers.DiscreetControls.keyState().toString()}
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
        authSequence++
        com.surakshaai.triggers.DiscreetControls.setFocusedKeys(false)
        com.surakshaai.triggers.DiscreetControls.cancel()
        com.surakshaai.monitoring.AudioMonitoringService.stop("ACCOUNT_CHANGED");com.surakshaai.monitoring.MotionSession.stop()
        val current=SafetyRuntime.state().optJSONObject("intent")
        if(current!=null&&current.optString("state")!="TERMINATED")throw HttpFailure(409,"RESOLVE_ACTIVE_SOS_FIRST")
        val journeys=JSONObject(SafetyRuntime.request("/journeys?status=ACTIVE&status=OVERDUE","GET"))
        if(journeys.getJSONArray("items").length()>0)throw HttpFailure(409,"FINISH_ACTIVE_JOURNEY_FIRST")
        SafetyRuntime.locationPurposes.keys.toList().forEach {val p=it.substringBefore(':');val r=it.substringAfter(':');SafetyRuntime.stopLocation(p,r)}
        com.surakshaai.monitoring.AudioMonitoringService.stop("ACCOUNT_CHANGED");com.surakshaai.monitoring.MotionSession.stop()
        SafetyRuntime.store.update {it.remove("active");it.remove("verification_id");it.remove("verification_purpose");it.remove("verification_uid")}
        SafetyRuntime.auth.signOut();"{}"
    }
    override fun startPhone(phone:String,promise:Promise)=requestPhone(phone,false,promise)
    override fun requestReauthentication(promise:Promise){
        val phone=SafetyRuntime.auth.currentUser?.phoneNumber
        if(phone==null){promise.reject("UNAUTHENTICATED",NativeFailure.message("UNAUTHENTICATED"));return}
        requestPhone(phone,true,promise)
    }
    private fun requestPhone(phone:String,reauth:Boolean,promise:Promise) {
        val activity=reactApplicationContext.currentActivity
        if(activity==null){promise.reject("ACTIVITY_REQUIRED","Open the app to sign in.");return}
        val expectedUid=SafetyRuntime.auth.currentUser?.uid
        val sequence=++authSequence
        activity.runOnUiThread {
            val options=PhoneAuthOptions.newBuilder(SafetyRuntime.auth).setPhoneNumber(phone)
                .setTimeout(60L,TimeUnit.SECONDS).setActivity(activity)
                .setCallbacks(object:PhoneAuthProvider.OnVerificationStateChangedCallbacks(){
                    override fun onVerificationCompleted(credential:PhoneAuthCredential){
                        if(sequence!=authSequence||(reauth&&SafetyRuntime.auth.currentUser?.uid!=expectedUid)){promise.reject("AUTH_FLOW_EXPIRED",NativeFailure.message("AUTH_FLOW_EXPIRED"));return}
                        val task=if(reauth)SafetyRuntime.auth.currentUser!!.reauthenticate(credential) else SafetyRuntime.auth.signInWithCredential(credential)
                        task.addOnCompleteListener { task->
                            if(task.isSuccessful)promise.resolve("{\"status\":\"VERIFIED\"}") else promise.reject("AUTH_FAILED","Phone verification failed.")
                        }
                    }
                    override fun onVerificationFailed(e:FirebaseException){promise.reject("AUTH_FAILED","Phone verification failed. Check your number, connection and Firebase Phone sign-in setup.")}
                    override fun onCodeSent(verificationId:String,token:PhoneAuthProvider.ForceResendingToken){
                        if(sequence!=authSequence||(reauth&&SafetyRuntime.auth.currentUser?.uid!=expectedUid)){promise.reject("AUTH_FLOW_EXPIRED",NativeFailure.message("AUTH_FLOW_EXPIRED"));return}
                        SafetyRuntime.store.update { it.put("verification_id",verificationId).put("verification_purpose",if(reauth)"REAUTH" else "SIGN_IN").put("verification_uid",expectedUid?:JSONObject.NULL) };promise.resolve("{\"status\":\"CODE_SENT\"}")
                    }
                }).build()
            PhoneAuthProvider.verifyPhoneNumber(options)
        }
    }
    override fun confirmPhone(code:String,promise:Promise)=async(promise){
        val pending=SafetyRuntime.store.read()
        require(pending.optString("verification_purpose","SIGN_IN")=="SIGN_IN"&&pending.has("verification_id")){"AUTH_FLOW_EXPIRED"}
        val credential=PhoneAuthProvider.getCredential(pending.getString("verification_id"),code)
        Tasks.await(SafetyRuntime.auth.signInWithCredential(credential),15,TimeUnit.SECONDS)
        SafetyRuntime.store.update {it.remove("verification_id");it.remove("verification_purpose");it.remove("verification_uid")}
        SafetyRuntime.recover();SafetyRuntime.authState().toString()
    }
    override fun confirmReauthentication(code:String,promise:Promise)=async(promise){
        val user=SafetyRuntime.auth.currentUser?:throw HttpFailure(401,"UNAUTHENTICATED")
        val pending=SafetyRuntime.store.read()
        require(pending.optString("verification_purpose")=="REAUTH"&&pending.optString("verification_uid")==user.uid&&pending.has("verification_id")){"AUTH_FLOW_EXPIRED"}
        val credential=PhoneAuthProvider.getCredential(pending.getString("verification_id"),code)
        Tasks.await(user.reauthenticate(credential),20,TimeUnit.SECONDS)
        require(SafetyRuntime.auth.currentUser?.uid==user.uid){"AUTH_FLOW_EXPIRED"}
        Tasks.await(user.getIdToken(true),12,TimeUnit.SECONDS)
        SafetyRuntime.store.update {it.remove("verification_id");it.remove("verification_purpose");it.remove("verification_uid")}
        "{\"status\":\"VERIFIED\"}"
    }
}
class SafetyPackage:BaseReactPackage(){
    override fun getModule(name:String,context:ReactApplicationContext):NativeModule? = if(name==NativeSafetyModule.NAME)NativeSafetyModule(context) else null
    override fun getReactModuleInfoProvider()=ReactModuleInfoProvider {
        mapOf(NativeSafetyModule.NAME to ReactModuleInfo(NativeSafetyModule.NAME,NativeSafetyModule.NAME,false,false,false,true))
    }
}
