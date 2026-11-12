package com.surakshaai.monitoring

// Pure session-only policy. No audio, transport, clock or Android dependency.
class RepeatedWordGate(val enabled:Boolean,private val threshold:Int=5,private val windowMs:Long=30000,private val countdownMs:Long=10000){
    private data class Entry(val hit:PhraseHit,val at:Long)
    private val words=mutableListOf<Entry>()
    private var suppressedUntil=0L
    @Volatile var deadline=0L;private set
    private var consumed=false
    @Synchronized fun add(hit:PhraseHit,now:Long,streamNowMs:Long){
        if(!enabled||consumed||deadline>0||now<suppressedUntil)return
        if(hit.label !in setOf("HELP","BACHAO")||!hit.confidence.isFinite()||hit.confidence !in .75..1.0||hit.startMs<0||hit.endMs-hit.startMs !in 80..3000||hit.endMs>streamNowMs+500)return
        val age=(streamNowMs-hit.endMs).coerceAtLeast(0)
        if(age>windowMs)return
        words.removeAll{now-it.at>windowMs}
        if(words.any{val overlap=minOf(it.hit.endMs,hit.endMs)-maxOf(it.hit.startMs,hit.startMs);overlap>0&&overlap.toDouble()/minOf(it.hit.endMs-it.hit.startMs,hit.endMs-hit.startMs)>.4})return
        words.add(Entry(hit,now-age))
        if(words.size>=threshold)deadline=now+countdownMs
    }
    @Synchronized fun count(now:Long):Int{words.removeAll{now-it.at>windowMs};return words.size}
    @Synchronized fun cancel(now:Long){words.clear();deadline=0;suppressedUntil=now+windowMs;consumed=false}
    @Synchronized fun takeDispatch(now:Long):Boolean{
        if(!enabled||consumed||deadline==0L||now<deadline)return false
        consumed=true;deadline=0;words.clear();return true
    }
}
