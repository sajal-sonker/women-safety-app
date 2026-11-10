package com.surakshaai.monitoring

import android.content.Context
import org.json.JSONObject
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.DataType
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest

class YamnetClassifier(context:Context):AutoCloseable {
    val manifest=JSONObject(context.assets.open("models/manifest.json").bufferedReader().use{it.readText()})
    private val bytes=context.assets.open("models/yamnet.tflite").use{it.readBytes()}
    private val buffer=ByteBuffer.allocateDirect(bytes.size).order(ByteOrder.nativeOrder()).apply{put(bytes);rewind()}
    private val interpreter:Interpreter
    private val input=ByteBuffer.allocateDirect(15600*4).order(ByteOrder.nativeOrder())
    private val output=Array(1){FloatArray(521)}
    init{
        val hash=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
        require(hash==manifest.getString("sha256")&&bytes.size==manifest.getInt("size_bytes")&&!manifest.getBoolean("automatic_dispatch")){"MODEL_INTEGRITY_FAILED"}
        interpreter=Interpreter(buffer,Interpreter.Options().setNumThreads(2))
        require(interpreter.getInputTensor(0).shape().contentEquals(intArrayOf(15600))&&interpreter.getInputTensor(0).dataType()==DataType.FLOAT32)
        require(interpreter.getOutputTensor(0).shape().contentEquals(intArrayOf(1,521))&&interpreter.getOutputTensor(0).dataType()==DataType.FLOAT32)
    }
    fun score(pcm:ShortArray):Double {
        require(pcm.size==15600);input.rewind();for(sample in pcm)input.putFloat(sample/32768.0f);input.rewind()
        interpreter.run(input,output);val score=output[0][manifest.getJSONObject("output").getInt("screaming_index")].toDouble();require(score.isFinite()&&score in 0.0..1.0);return score
    }
    override fun close(){interpreter.close();input.clear();for(row in output)row.fill(0f)}
}
