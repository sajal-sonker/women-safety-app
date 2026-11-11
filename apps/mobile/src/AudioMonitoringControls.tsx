import React,{useEffect,useRef,useState} from 'react';
import {PermissionsAndroid,Platform,Switch,Text,View} from 'react-native';
import NativeSafety from '../specs/NativeSafety';
import {api} from './api';
import {Button,Card,s} from './components';
import {checkInMessage,type MonitoringState} from './monitoring';
export function AudioMonitoringControls({monitoring,busy,run,setNotice}:{monitoring?:MonitoringState;busy:boolean;run:(action:()=>Promise<void>)=>Promise<void>;setNotice:(message:string)=>void}){
 const [consent,setConsent]=useState(false);
 const consentNow=useRef(false),generation=useRef(0),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 function stop(){
  generation.current++;consentNow.current=false;setConsent(false);
  return run(async()=>{
   await NativeSafety.stopMonitoring();
   try{await api('/me/consents','PATCH',{version:'consent-v1',monitoring:false});setNotice('Local monitoring stopped and consent withdrawn.');}
   catch{setNotice('Local monitoring stopped. Server consent update unconfirmed; reconnect and retry.');}
  });
 }
 function start(){
  if(!consentNow.current)return Promise.resolve();
  const token=++generation.current,valid=()=>mounted.current&&consentNow.current&&generation.current===token;
  return run(async()=>{
   const permissions=await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,...(Number(Platform.Version)>=33?[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]:[])]);
   if(!valid())return;
   if(permissions[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]!==PermissionsAndroid.RESULTS.GRANTED)throw Error('Microphone permission denied. Manual SOS remains available.');
   await api('/me/consents','PATCH',{version:'consent-v1',monitoring:true});
   if(!valid()){
    if(!consentNow.current)try{await api('/me/consents','PATCH',{version:'consent-v1',monitoring:false});}catch{/* Local start is cancelled regardless of connectivity. */}
    return;
   }
   await NativeSafety.startMonitoring(JSON.stringify({consent_version:'consent-v1',audio_consent:true,motion_consent:true,phrase_consent:true,mode:'CONFIRMATION_ONLY',duration_minutes:30}));
   if(!valid()){await NativeSafety.stopMonitoring();return;}
   setNotice('Start requested. Wait for active microphone and phrase recognition below. First start prepares bundled language models.');
  });
 }
 return <Card title="Offline Help, Bachao & sound check-ins">
  <Text style={s.body}>Optional on-device English and Hindi speech recognition listens for Help and Bachao (बचाओ). YAMNet also checks scream-like sounds, with motion as supporting context. A recognized word or sound can ask you to check in; it does not identify an attack or send an automatic SOS. Microphone audio and transcripts are never saved or uploaded.</Text>
  <Text style={s.small}>An ongoing microphone notification has a Stop action. Stop, expiry, permission loss or audio conflicts end the session. Android may stop it. Ordinary conversation or TV may prompt a check-in; noise, accents and whispers may be missed.</Text>
  <View style={s.split}><Text style={s.body}>I consent to 30 minutes of local microphone, motion and English/Hindi phrase analysis</Text><Switch accessibilityLabel="Consent to audio, motion and phrase monitoring" value={consent} onValueChange={value=>{if(value){generation.current++;consentNow.current=true;setConsent(true);}else{void stop();}}}/></View>
  <Button title="Start 30-minute audio check-in session" disabled={busy||!consent} onPress={start}/>
  <Text style={s.pill}>{monitoring?.status??'STOPPED'} · {monitoring?.remaining_seconds??0}s</Text>
  <Text style={s.small}>Microphone: {monitoring?.microphone?'active':'inactive'} · Motion sensor: {monitoring?.motion_available?'available':'unavailable or inactive'} · automatic SOS disabled</Text>
  <Text style={s.body}>Help / Bachao recognition: {monitoring?.phrase_status??'STOPPED'}</Text>
  {monitoring?.phrase_status==='LOADING'&&<Text style={s.small}>Preparing offline language models. No microphone audio is processed until loading finishes. You can stop now.</Text>}
  {monitoring?.last_phrase&&<Text accessibilityRole="status" style={s.notice}>Last recognized target: {monitoring.last_phrase==='HELP'?'Help':'Bachao / बचाओ'}</Text>}
  <Text style={s.small}>Server consent: {monitoring?.remote_consent??'not checked'}. If offline, use Stop here to end local capture; remote changes apply when reachable.</Text>
  {monitoring?.reason&&<Text style={s.small}>Session ended/degraded: {monitoring.reason}</Text>}
  {monitoring?.windows!==undefined&&<Text selectable style={s.small}>Test diagnostics: {monitoring.windows} sound windows · audio score {monitoring.audio_score?.toFixed(3)} · p95 sound inference {monitoring.inference_p95_ms?.toFixed(1)??'—'}ms · process PSS {monitoring.native_pss_kb??'—'}KiB. Scores are not danger probabilities or measured recognition accuracy.</Text>}
  {monitoring?.check_in&&<><Text accessibilityRole="alert" style={s.notice}>{checkInMessage(monitoring.decision)} Choose whether to request help.</Text><Button title="Request SOS now" onPress={()=>run(async()=>{await NativeSafety.activateSos('MANUAL');})}/><Button title="I am okay — dismiss check-in" secondary onPress={()=>run(async()=>{await NativeSafety.dismissMonitoringCheckIn();})}/></>}
  <Button title="Stop audio monitoring and withdraw consent" secondary onPress={stop}/>
 </Card>;
}
