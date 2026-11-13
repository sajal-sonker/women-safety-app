package com.surakshaai

import java.io.IOException
import java.util.concurrent.ExecutionException

object NativeFailure {
    private val messages=mapOf(
        "SERVER_CONFIGURATION_REQUIRED" to "This build has no valid server connection. Install the build configured for your test server.",
        "PIN_FORMAT" to "Use 6 to 12 digits for each app PIN.",
        "PIN_MUST_DIFFER" to "Choose different normal and duress PINs.",
        "PIN_NOT_ACCEPTED" to "That app PIN was not accepted. Try again after the short delay.",
        "SETUP_REQUIRED" to "Set up app PINs for this signed-in account first.",
        "TRY_LATER" to "Too many PIN attempts. Wait before trying again.",
        "RECENT_AUTH_REQUIRED" to "Verify your phone again here before setting or resetting PINs.",
        "AUTH_FLOW_EXPIRED" to "Request a new verification code for this account.",
        "AUTH_INVALID_CODE" to "The verification code was not accepted. Request another code if it expired.",
        "NETWORK_UNAVAILABLE" to "Cannot reach the server. Check internet and the app's server connection, then retry.",
        "UNAUTHENTICATED" to "Your sign-in is unavailable. Verify your phone again.",
        "PERMISSION_UNAVAILABLE" to "A required permission is off. Review this feature's access in phone settings.",
        "FOREGROUND_REQUIRED" to "Keep the app open while starting this action.",
        "CONSENT_REQUIRED" to "Enable the consent option for this feature first.",
        "MICROPHONE_BUSY" to "Stop the current microphone session before starting another capture.",
        "MOTION_UNAVAILABLE" to "Motion sensing could not start. Stop Voice first, then try again.",
        "SENSOR_UNAVAILABLE" to "This phone's motion sensor is unavailable.",
        "ALERT_NOTIFICATIONS_REQUIRED" to "Enable Voice check-in alert notifications before using repeated-word SOS.",
        "NOTIFICATION_PERMISSION_REQUIRED" to "Allow notifications for this feature in phone settings.",
        "AUTO_DISPATCH_DISABLED" to "Automatic SOS is not enabled for this listening session. Manual SOS is available.",
        "FEATURE_DISABLED" to "This action is unavailable in this build.",
        "TERMINATE_PREVIOUS_INTENT" to "Resolve or stop the previous alert on Home before starting another.",
        "RESOLVE_ACTIVE_SOS_FIRST" to "Resolve your active alert on Home before signing out.",
        "FINISH_ACTIVE_JOURNEY_FIRST" to "End your active journey before signing out.",
        "LOCAL_STORAGE_UNAVAILABLE" to "The encrypted safety data could not be accessed. Keep the emergency dialer available and retry.",
        "FORBIDDEN" to "This account is not allowed to perform that action.",
        "VALIDATION_ERROR" to "Check the entered values and try again.",
        "RATE_LIMITED" to "Too many requests. Wait briefly before retrying.",
        "DEPENDENCY_UNAVAILABLE" to "The service is temporarily unavailable. Please retry.",
        "ACTION_FAILED" to "This action could not complete. Try again; your current alert remains unchanged."
    )
    fun code(error:Exception):String {
        if(error is HttpFailure)return error.code
        val root=if(error is ExecutionException)error.cause?:error else error
        if(root is IOException || root.javaClass.simpleName.contains("Network"))return "NETWORK_UNAVAILABLE"
        if(root is SecurityException)return "PERMISSION_UNAVAILABLE"
        if(root is java.security.GeneralSecurityException || root.message=="Journal persistence failed")return "LOCAL_STORAGE_UNAVAILABLE"
        if(root.javaClass.simpleName.contains("InvalidCredentials"))return "AUTH_INVALID_CODE"
        return root.message?.takeIf{messages.containsKey(it)}?:"ACTION_FAILED"
    }
    fun message(code:String)=messages[code]?:"The action could not be confirmed. Retry or check your account status."
}
