package com.surakshaai.monitoring

import java.text.Normalizer
import java.util.Locale
import com.google.gson.JsonParser

data class RecognizedWord(val word:String,val confidence:Double,val start:Double,val end:Double)
data class PhraseHit(val label:String,val confidence:Double,val startMs:Long=0,val endMs:Long=0)

// Only finalized, timed words qualify. Never interpret a substring or a partial
// transcript as a keyword. Confidence is an ASR score, not a danger probability.
object PhrasePolicy {
    fun finalized(language:String,json:String,minimum:Double=.75):PhraseHit? {
        return finalizedWords(language,json,minimum).maxByOrNull{it.confidence}
    }
    fun finalizedWords(language:String,json:String,minimum:Double=.75):List<PhraseHit> {
        if(json.length>32768)return emptyList()
        return runCatching {
            val result=JsonParser.parseString(json).asJsonObject.getAsJsonArray("result")?:return emptyList()
            if(result.size()>256)return emptyList()
            matches(language,result.map{entry->val word=entry.asJsonObject;RecognizedWord(word.get("word").asString,word.get("conf").asDouble,word.get("start").asDouble,word.get("end").asDouble)},minimum)
        }.getOrDefault(emptyList())
    }
    fun match(language:String,words:List<RecognizedWord>,minimum:Double=.75):PhraseHit? {
        return matches(language,words,minimum).maxByOrNull{it.confidence}
    }
    private fun matches(language:String,words:List<RecognizedWord>,minimum:Double):List<PhraseHit> {
        require(minimum.isFinite()&&minimum in 0.0..1.0)
        if(words.size>256)return emptyList()
        return words.mapNotNull { token ->
            if(!token.confidence.isFinite()||token.confidence !in minimum..1.0||!token.start.isFinite()||!token.end.isFinite()||token.start<0||token.end-token.start !in .08..3.0)return@mapNotNull null
            val word=Normalizer.normalize(token.word,Normalizer.Form.NFKC).lowercase(Locale.ROOT)
            val label=when {language=="en"&&word=="help"->"HELP";language=="hi"&&word=="बचाओ"->"BACHAO";else->return@mapNotNull null}
            PhraseHit(label,token.confidence,(token.start*1000).toLong(),(token.end*1000).toLong())
        }
    }
}
