package com.surakshaai.monitoring

import android.app.Activity
import android.app.Instrumentation
import android.os.Bundle
import org.json.JSONArray
import org.json.JSONObject
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest

// Runs the real Android Vosk/JNA runtime on generated files. No microphone,
// permissions, user accounts, network requests or SOS transport are exercised.
class PhraseSmokeInstrumentation:Instrumentation() {
    override fun onCreate(arguments:Bundle?){super.onCreate(arguments);start()}
    override fun onStart(){
        val result=Bundle()
        try {
            val catalog=JSONObject(context.assets.open("manifest.json").bufferedReader().use{it.readText()})
            require(catalog.getString("kind")=="GENERATED_ESPEAK_NG_1.52.0_TOOLCHAIN_ONLY")
            val fixtures=catalog.getJSONArray("fixtures")
            val rows=JSONArray()
            require(fixtures.length()==10)
            for(i in 0 until fixtures.length()){
                val item=fixtures.getJSONObject(i)
                val bytes=context.assets.open(item.getString("file")).use{it.readBytes()}
                val hash=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
                require(hash==item.getString("sha256")&&bytes.size in 44..1000000)
                val header=ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
                require(String(bytes,0,4)=="RIFF"&&String(bytes,8,4)=="WAVE"&&header.getInt(24)==16000&&header.getShort(22).toInt()==1&&header.getShort(34).toInt()==16)
                val pcm=ByteBuffer.wrap(bytes,44,bytes.size-44).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
                val chunk=ShortArray(1600)
                val labels=linkedSetOf<String>()
                // Exercise LiteRT and Vosk in one Android process too.
                val soundWindow=ShortArray(15600)
                pcm.duplicate().get(soundWindow)
                YamnetClassifier(targetContext).use{classifier->require(classifier.score(soundWindow).isFinite())}
                soundWindow.fill(0)
                OfflinePhraseRecognizer(targetContext){true}.use{recognizer->
                    while(pcm.hasRemaining()){
                        val count=minOf(chunk.size,pcm.remaining());pcm.get(chunk,0,count)
                        recognizer.accept(chunk,count)?.let{labels.add(it.label)}
                        chunk.fill(0)
                    }
                }
                val expected=if(item.isNull("expected"))emptySet() else setOf(item.getString("expected"))
                rows.put(JSONObject().put("fixture",item.getString("file")).put("passed",labels==expected).put("labels",JSONArray(labels.toList())))
                require(labels==expected){"Generated fixture mismatch: "+item.getString("file")}
            }
            result.putString("result",JSONObject().put("status","PASS_ANDROID_GENERATED_SPEECH_ONLY").put("cases",rows).put("microphone_opened",false).put("automatic_dispatch",false).toString())
            finish(Activity.RESULT_OK,result)
        }catch(error:Throwable){
            result.putString("result",JSONObject().put("status","FAIL").put("error_class",error.javaClass.simpleName).put("detail",error.message?:"Android runtime failure").put("microphone_opened",false).toString())
            finish(Activity.RESULT_CANCELED,result)
        }
    }
}
