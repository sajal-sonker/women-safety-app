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

class NativeSafetyModule(context:ReactApplicationContext):NativeSafetySpec(context){
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
    private fun async(p:Promise,work:()->String){SafetyRuntime.io.execute{try{p.resolve(work())}catch(e:Exception){p.reject(if(e is HttpFailure)e.code else "ACTION_FAILED","Action could not complete. Check permissions and connection.")}}}
    override fun initialize(config:String,promise:Promise)=async(promise){SafetyRuntime.initialize(config)}
    override fun getAuthState(promise:Promise)=async(promise){SafetyRuntime.authState().toString()}
    override fun apiRequest(path:String,method:String,body:String,key:String,headers:String,promise:Promise)=async(promise){SafetyRuntime.request(path,method,body,key,JSONObject(headers))}
    override fun activateSos(trigger:String,promise:Promise)=async(promise){SafetyRuntime.activate(trigger).toString()}
    override fun getIntent(clientRequestId:String,promise:Promise)=async(promise){SafetyRuntime.state().optJSONObject("intent")?.takeIf{it.optString("client_request_id")==clientRequestId}?.toString()?:"{}"}
    override fun terminateIntent(clientRequestId:String,reason:String,promise:Promise)=async(promise){SafetyRuntime.terminate(clientRequestId,reason).toString()}
    override fun startLocation(purpose:String,resourceId:String,expiresAt:String,promise:Promise)=async(promise){SafetyRuntime.startLocation(purpose,resourceId,expiresAt).toString()}
    override fun stopLocation(purpose:String,resourceId:String,promise:Promise)=async(promise){SafetyRuntime.stopLocation(purpose,resourceId);"{}"}
    override fun getSafetyState(promise:Promise)=async(promise){SafetyRuntime.state().toString()}
    override fun startMonitoring(config:String,promise:Promise){promise.reject("FEATURE_DISABLED","Monitoring is planned for phase3.")}
    override fun stopMonitoring(promise:Promise){promise.resolve("{}")}
    override fun clearAccount(promise:Promise)=async(promise){
        val current=SafetyRuntime.state().optJSONObject("intent")
        if(current!=null&&current.optString("state")!="TERMINATED")throw HttpFailure(409,"RESOLVE_ACTIVE_SOS_FIRST")
        val journeys=JSONObject(SafetyRuntime.request("/journeys?status=ACTIVE&status=OVERDUE","GET"))
        if(journeys.getJSONArray("items").length()>0)throw HttpFailure(409,"FINISH_ACTIVE_JOURNEY_FIRST")
        SafetyRuntime.locationPurposes.keys.toList().forEach {val p=it.substringBefore(':');val r=it.substringAfter(':');SafetyRuntime.stopLocation(p,r)}
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
