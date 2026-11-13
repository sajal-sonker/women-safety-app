package com.surakshaai

import java.net.URI

object NetworkEndpointPolicy {
    fun allowed(value:String,controlledDemo:Boolean):Boolean=runCatching {
        val uri=URI(value)
        uri.host!=null && uri.rawUserInfo==null && uri.rawQuery==null && uri.rawFragment==null &&
        (uri.port==-1||uri.port in 1..65535) && (uri.rawPath.isNullOrEmpty()||uri.rawPath=="/") &&
        (uri.scheme=="https" || controlledDemo&&uri.scheme=="http"&&uri.host in listOf("127.0.0.1","localhost","10.0.2.2"))
    }.getOrDefault(false)
}
