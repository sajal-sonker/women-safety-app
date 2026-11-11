package com.surakshaai.monitoring
import org.junit.Assert.*
import org.junit.Test
class PhrasePolicyTest {
    private fun word(text:String,confidence:Double=.9,start:Double=.1,end:Double=.6)=RecognizedWord(text,confidence,start,end)
    @Test fun englishAndHindiFinalWordsMatch(){assertEquals("HELP",PhrasePolicy.match("en",listOf(word("HELP")))?.label);assertEquals("BACHAO",PhrasePolicy.match("hi",listOf(word("बचाओ")))?.label)}
    @Test fun ordinaryWordsSubstringsAndWrongLanguageDoNotMatch(){for(text in listOf("helper","helpful","helping","hello","shelf","[unk]"))assertNull(PhrasePolicy.match("en",listOf(word(text))));assertNull(PhrasePolicy.match("hi",listOf(word("बताओ"))));assertNull(PhrasePolicy.match("en",listOf(word("बचाओ"))))}
    @Test fun missingOrInvalidConfidenceAndTimingFailClosed(){for(w in listOf(word("help",.74),word("help",Double.NaN),word("help",1.1),word("help",start=-.1),word("help",end=.12),word("help",end=4.0)))assertNull(PhrasePolicy.match("en",listOf(w)));assertNull(PhrasePolicy.match("en",emptyList()))}
    @Test fun keywordsAskForCheckInWithoutMotionOrScream(){assertEquals("HELP_CHECK_IN",FusionDecision().update(.0,null,100,"HELP"));assertEquals("BACHAO_CHECK_IN",FusionDecision().update(.0,null,100,"BACHAO"))}
    @Test fun cooldownIsSharedAcrossPhraseAndSound(){val gate=FusionDecision();assertEquals("HELP_CHECK_IN",gate.update(.0,null,100,"HELP"));assertEquals("NORMAL",gate.update(.9,null,101));assertEquals("NORMAL",gate.update(.0,null,102,"BACHAO"));assertEquals("BACHAO_CHECK_IN",gate.update(.0,null,120100,"BACHAO"))}
    @Test(expected=IllegalArgumentException::class) fun arbitraryLabelsCannotBecomeTriggers(){FusionDecision().update(0.0,null,0,"ATTACK")}
    @Test fun parserRejectsPartialMalformedOrUnscoredTranscripts(){for(json in listOf("{\"partial\":\"help\"}","{\"text\":\"help\"}","{\"result\":[{\"word\":\"help\"}]}","broken", "{\"result\":{}}"))assertNull(PhrasePolicy.finalized("en",json));assertEquals("HELP",PhrasePolicy.finalized("en","{\"result\":[{\"word\":\"help\",\"conf\":0.9,\"start\":0.1,\"end\":0.6}]}")?.label)}
}
