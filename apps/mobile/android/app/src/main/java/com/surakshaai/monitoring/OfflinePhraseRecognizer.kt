package com.surakshaai.monitoring

import android.content.Context
import org.json.JSONObject
import org.vosk.LibVosk
import org.vosk.LogLevel
import org.vosk.Model
import org.vosk.Recognizer
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.CancellationException

// Both recognizers consume the SAME fresh PCM once. This class never owns an
// AudioRecord, network client, transcript log, recording file or SOS transport.
class OfflinePhraseRecognizer(private val context:Context,private val active:()->Boolean):AutoCloseable {
    private data class Engine(val language:String,val model:Model,val recognizer:Recognizer,var samples:Int=0,var baseSamples:Long=0)
    private val engines=mutableListOf<Engine>()
    private val manifest=JSONObject(context.assets.open("phrases/manifest.json").bufferedReader().use{it.readText()})
    private val minimum=manifest.getDouble("minimum_word_confidence")
    init {
        try {
            require(!manifest.getBoolean("automatic_dispatch")&&manifest.getString("id")=="vosk-help-bachao-v1"&&manifest.getInt("sample_rate_hz")==16000&&minimum.isFinite()&&minimum in 0.0..1.0)
            LibVosk.setLogLevel(LogLevel.WARNINGS)
            val models=manifest.getJSONArray("models")
            for(i in 0 until models.length()){
                checkActive()
                val item=models.getJSONObject(i)
                val model=Model(materialize(item).absolutePath)
                try {
                    checkActive()
                    val recognizer=Recognizer(model,16000f,item.getJSONArray("grammar").toString())
                    recognizer.setWords(true)
                    engines.add(Engine(item.getString("language"),model,recognizer))
                }catch(e:Throwable){model.close();throw e}
            }
            require(engines.map{it.language}.toSet()==setOf("en","hi"))
        }catch(e:Throwable){close();throw e}
    }
    private fun checkActive(){if(!active())throw CancellationException("Monitoring stopped")}
    private fun digest(file:File):String {
        val hash=MessageDigest.getInstance("SHA-256")
        file.inputStream().use{input->val buffer=ByteArray(65536);while(true){checkActive();val count=input.read(buffer);if(count<0)break;hash.update(buffer,0,count)}}
        return hash.digest().joinToString(""){"%02x".format(it)}
    }
    private fun materialize(item:JSONObject):File {
        val id=item.getString("id");require(id.matches(Regex("vosk-model-small-[a-z0-9.-]+")))
        val root=File(context.noBackupFilesDir,"phrase-models/$id").canonicalFile
        require(root.mkdirs()||root.isDirectory)
        val files=item.getJSONArray("files")
        for(i in 0 until files.length()){
            checkActive();val spec=files.getJSONObject(i);val name=spec.getString("path")
            val target=File(root,name).canonicalFile
            require(target.path.startsWith(root.path+File.separator)&&!name.contains('\\'))
            val expected=spec.getString("sha256");require(expected.matches(Regex("[a-f0-9]{64}")))
            if(target.isFile&&target.length()==spec.getLong("size_bytes")&&digest(target)==expected)continue
            require(target.parentFile!!.mkdirs()||target.parentFile!!.isDirectory)
            val temporary=File(target.parentFile,".${target.name}.${UUID.randomUUID()}.part")
            try {
                context.assets.open("phrases/$id/$name").use{input->temporary.outputStream().use{output->val buffer=ByteArray(65536);while(true){checkActive();val n=input.read(buffer);if(n<0)break;output.write(buffer,0,n)}}}
                require(temporary.length()==spec.getLong("size_bytes")&&digest(temporary)==expected){"PHRASE_MODEL_INTEGRITY_FAILED"}
                checkActive();if(target.exists())require(target.delete());require(temporary.renameTo(target))
            }finally{temporary.delete()}
        }
        return root
    }
    fun accept(samples:ShortArray,count:Int):PhraseHit? {
        return acceptWords(samples,count).maxByOrNull{it.confidence}
    }
    fun acceptWords(samples:ShortArray,count:Int):List<PhraseHit> {
        require(count in 1..samples.size)
        val hits=mutableListOf<PhraseHit>()
        for(engine in engines){
            checkActive();engine.samples+=count
            val ended=engine.recognizer.acceptWaveForm(samples,count)
            val result=when {ended->engine.recognizer.result;engine.samples>=16000*15->engine.recognizer.finalResult;else->null}
            // Keep transcripts local to this stack and immediately discard them.
            if(result!=null){hits.addAll(PhrasePolicy.finalizedWords(engine.language,result,minimum).map{it.copy(startMs=it.startMs+engine.baseSamples/16,endMs=it.endMs+engine.baseSamples/16)})
                // Bound decoder history even during continuous speech/noise.
                if(engine.samples>=16000*15){engine.recognizer.reset();engine.baseSamples+=engine.samples;engine.samples=0}
            }
        }
        return hits.sortedBy{it.endMs}
    }
    override fun close(){for(engine in engines.asReversed()){runCatching{engine.recognizer.close()};runCatching{engine.model.close()}};engines.clear()}
}
