import React,{useEffect,useRef,useState} from 'react';
import {PermissionsAndroid,Platform,Switch,Text,View} from 'react-native';
import NativeSafety from '../specs/NativeSafety';
import {api} from './api';
import {Button,Card,Disclosure,s} from './components';
import {checkInMessage,type MonitoringState} from './monitoring';
export function AudioMonitoringControls({monitoring,busy,run,setNotice}:{monitoring?:MonitoringState;busy:boolean;run:(action:()=>Promise<void>)=>Promise<void>;setNotice:(message:string)=>void}){
 const [consent,setConsent]=useState(false);
 const [starting,setStarting]=useState(false),[requested,setRequested]=useState(false);
 const consentNow=useRef(false),generation=useRef(0),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
 useEffect(()=>{if(monitoring?.status&&monitoring.status!=='STARTING')setRequested(false);},[monitoring]);
 function stop(){
  generation.current++;consentNow.current=false;setConsent(false);setStarting(false);setRequested(false);
  return run(async()=>{
   await NativeSafety.stopMonitoring();
   try{await api('/me/consents','PATCH',{version:'consent-v1',monitoring:false});setNotice('Listening stopped.');}
   catch{setNotice('Listening stopped on this phone. Consent sync will need a connection.');}
  });
 }
 function start(){
  if(!consentNow.current)return Promise.resolve();
  const token=++generation.current,valid=()=>mounted.current&&consentNow.current&&generation.current===token;
  setStarting(true);
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
   setRequested(true);setNotice('Preparing voice check-in…');
  }).finally(()=>{if(mounted.current)setStarting(false);});
 }
 const active=['STARTING','ACTIVE_CONFIRMATION_ONLY'].includes(monitoring?.status??''),pending=starting||requested||monitoring?.phrase_status==='LOADING';
 const listening=monitoring?.phrase_recognition&&monitoring?.microphone;
 const label=pending?'Preparing…':listening?'Listening':monitoring?.status==='DEGRADED'?'Unavailable':'Off';
 return <Card title="Voice check-in">
  <Text style={s.body}>Say “Help” or “Bachao / बचाओ” to receive a check-in prompt.</Text>
  <Text style={s.pill}>{label}{listening?' · '+Math.ceil((monitoring?.remaining_seconds??0)/60)+' min left':''}</Text>
  <Text style={s.small}>No automatic SOS. Audio stays on your phone.</Text>
  {!active&&<><View style={s.split}><Text style={s.option}>Allow 30 minutes of on-device voice and motion analysis</Text><Switch accessibilityLabel="Consent to audio, motion and phrase monitoring" value={consent} onValueChange={value=>{if(value){generation.current++;consentNow.current=true;setConsent(true);}else{void stop();}}}/></View>{!pending&&<Button title="Start listening" disabled={busy||!consent} onPress={start}/>}</>}
  {pending&&<Text style={s.small}>Preparing offline speech models. You can cancel at any time.</Text>}
  {monitoring?.last_phrase&&<Text accessibilityLiveRegion="polite" style={s.notice}>Heard {monitoring.last_phrase==='HELP'?'Help':'Bachao / बचाओ'}</Text>}
  {monitoring?.remote_consent==='UNCONFIRMED_OFFLINE'&&<Text style={s.small}>Offline. Listening is local; Stop still works.</Text>}
  {monitoring?.status==='DEGRADED'&&<Text accessibilityRole="alert" style={s.small}>Listening stopped. Check microphone access and try again. Manual SOS is available on Home.</Text>}
  {monitoring?.check_in&&<><Text accessibilityRole="alert" style={s.notice}>{checkInMessage(monitoring.decision)}</Text><Button title="Request SOS now" onPress={()=>run(async()=>{await NativeSafety.activateSos('MANUAL');})}/><Button title="I am okay — dismiss check-in" secondary onPress={()=>run(async()=>{await NativeSafety.dismissMonitoringCheckIn();})}/></>}
  {(active||pending)&&<Button title={pending?'Cancel start':'Stop listening'} secondary onPress={stop}/>}
  <Disclosure title="How voice check-in works"><Text style={s.small}>Pause after speaking. Repeated prompts have a 2-minute cooldown. Ordinary speech or TV may prompt a check-in; some voices or noise may be missed. A visible microphone notification lets you stop. Android, calls or permission changes may end the session.</Text></Disclosure>
  <Disclosure title="Session details"><Text selectable style={s.small}>Status: {monitoring?.status??'STOPPED'} · phrases: {monitoring?.phrase_status??'STOPPED'} · microphone: {monitoring?.microphone?'active':'inactive'} · consent: {monitoring?.remote_consent??'not checked'}</Text>{monitoring?.reason&&<Text style={s.small}>{monitoring.reason}</Text>}<Text selectable style={s.small}>{monitoring?.windows??0} windows · score {monitoring?.audio_score?.toFixed(3)??'—'} · inference p95 {monitoring?.inference_p95_ms?.toFixed(1)??'—'}ms · PSS {monitoring?.native_pss_kb??'—'}KiB</Text></Disclosure>
 </Card>;
}
