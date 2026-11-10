package com.surakshaai.evidence

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.media.*
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.surakshaai.*
import com.surakshaai.triggers.DiscreetControls
import org.json.*
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.time.Instant
import java.util.concurrent.TimeUnit

class EvidenceCapture(private val context:ReactApplicationContext):BaseActivityEventListener(){
    private var pending:Promise?=null
    private var eventId=""
    private var recipients="[]"
    companion object {@Volatile var recording=false}
    init{context.addActivityEventListener(this)}
    fun capture(event:String,kind:String,scope:String,promise:Promise){
        if(pending!=null||recording){promise.reject("CAPTURE_BUSY","Finish or stop the current capture.");return}
        if(!DiscreetControls.visible||context.currentActivity==null){promise.reject("FOREGROUND_REQUIRED","Open the app to capture evidence.");return}
        pending=promise;eventId=event;recipients=scope
        SafetyRuntime.io.execute{
            try{
                val profile=JSONObject(SafetyRuntime.request("/me","GET"));require(profile.getJSONObject("consents").optBoolean("evidence"))
                val sos=JSONObject(SafetyRuntime.request("/sos/$event","GET"));require(sos.optString("status") !in listOf("RESOLVED","CANCELLED"))
                if(kind=="AUDIO")audio() else if(kind=="PHOTO"){
                    context.currentActivity?.runOnUiThread{try{context.currentActivity?.startActivityForResult(Intent(MediaStore.ACTION_IMAGE_CAPTURE),714)?:throw IllegalStateException()}catch(_:Exception){fail()}}
                }else fail()
            }catch(_:Exception){fail()}
        }
    }
    private fun audio(){
        require(DiscreetControls.visible&&ContextCompat.checkSelfPermission(context,Manifest.permission.RECORD_AUDIO)==PackageManager.PERMISSION_GRANTED)
        val size=maxOf(4096,AudioRecord.getMinBufferSize(16000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT))
        val source=AudioRecord(MediaRecorder.AudioSource.MIC,16000,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT,size)
        val out=ByteArrayOutputStream();val buffer=ByteArray(size);recording=true
        try{
            require(source.state==AudioRecord.STATE_INITIALIZED);source.startRecording();val started=android.os.SystemClock.elapsedRealtime()
            val audioManager=SafetyRuntime.context.getSystemService(android.content.Context.AUDIO_SERVICE) as AudioManager
            while(recording&&DiscreetControls.visible&&out.size()<320000&&android.os.SystemClock.elapsedRealtime()-started<10500){require(audioManager.mode==AudioManager.MODE_NORMAL);val n=source.read(buffer,0,minOf(buffer.size,320000-out.size()));require(n>0);out.write(buffer,0,n)}
            require(recording&&DiscreetControls.visible&&out.size()>0);val pcm=out.toByteArray();val header=ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
            header.put("RIFF".toByteArray()).putInt(36+pcm.size).put("WAVEfmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(16000).putInt(32000).putShort(2).putShort(16).put("data".toByteArray()).putInt(pcm.size)
            source.stop();source.release();recording=false;upload(header.array()+pcm,"AUDIO","audio/wav",pcm.size/32000.0)
        }catch(_:Exception){runCatching{source.stop()};source.release();recording=false;fail()}finally{buffer.fill(0);out.reset()}
    }
    @Suppress("DEPRECATION") override fun onActivityResult(activity:Activity,requestCode:Int,resultCode:Int,data:Intent?){
        if(requestCode!=714)return
        val bitmap=data?.extras?.get("data") as? Bitmap
        if(resultCode!=Activity.RESULT_OK||bitmap==null){fail();return}
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({SafetyRuntime.io.execute{try{val out=ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.JPEG,90,out);bitmap.recycle();upload(out.toByteArray(),"PHOTO","image/jpeg",null)}catch(_:Exception){fail()}}},300)
    }
    private fun upload(bytes:ByteArray,kind:String,mime:String,duration:Double?){
        try{
            require(DiscreetControls.visible)
            val digest=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
            val b=JSONObject().put("kind",kind).put("mime",mime).put("size_bytes",bytes.size).put("sha256",digest).put("duration_s",duration?:JSONObject.NULL).put("captured_at",Instant.now().toString()).put("consent_version","consent-v1").put("recipient_ids",JSONArray(recipients))
            val presign=JSONObject(SafetyRuntime.request("/sos/$eventId/evidence/presign","POST",b.toString()))
            require(DiscreetControls.visible)
            val asset=presign.getString("asset_id");require(presign.getString("upload_url")=="/v1/evidence/$asset/upload")
            val user=SafetyRuntime.auth.currentUser?:throw IllegalStateException();val bearer=com.google.android.gms.tasks.Tasks.await(user.getIdToken(false),12,TimeUnit.SECONDS).token
            val connection=URL(SafetyRuntime.baseUrl+presign.getString("upload_url")).openConnection() as HttpURLConnection
            try{connection.requestMethod="PUT";connection.connectTimeout=7000;connection.readTimeout=10000;connection.instanceFollowRedirects=false;connection.doOutput=true;connection.setFixedLengthStreamingMode(bytes.size);connection.setRequestProperty("Authorization","Bearer $bearer");connection.setRequestProperty("Content-Type",mime);connection.setRequestProperty("x-amz-checksum-sha256",digest);connection.outputStream.use{it.write(bytes)};require(connection.responseCode in 200..299)}finally{connection.disconnect()}
            require(DiscreetControls.visible);val result=SafetyRuntime.request("/sos/$eventId/evidence/$asset/complete","POST","{}")
            pending?.resolve(result);pending=null
        }catch(_:Exception){fail()}finally{bytes.fill(0)}
    }
    private fun fail(){pending?.reject("EVIDENCE_UNAVAILABLE","Evidence was not confirmed available. SOS remains independent. Capture requires foreground consent, permissions and connectivity.");pending=null}
}
