import React,{useState} from 'react';
import {PermissionsAndroid,Switch,Text,View} from 'react-native';
import NativeSafety from '../specs/NativeSafety';
import {api,type Model} from './api';
import {Button,Card,s} from './components';
export function EvidenceControls({event,refresh}:{event:Model<'SosDetail'>;refresh:()=>Promise<void>}){
 const [selected,setSelected]=useState<string[]>([]),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function capture(kind:'AUDIO'|'PHOTO'){
  setBusy(true);setMessage('');try{
   if(!consent||!selected.length)throw Error('Choose recipients and give separate capture consent.');
   if(kind==='AUDIO'){const permission=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);if(permission!==PermissionsAndroid.RESULTS.GRANTED)throw Error('Microphone permission denied. SOS continues without audio.');}
   await api('/me/consents','PATCH',{version:'consent-v1',evidence:true});
   const result=JSON.parse(await NativeSafety.captureEvidence(event.event_id,kind,JSON.stringify(selected)));
   setMessage('Evidence '+result.status+'. Availability awaits validation; SOS is independent.');await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:'Capture unavailable. SOS remains active.');}finally{setBusy(false);}
 }
 return <Card title="Optional private evidence"><Text style={s.body}>Separate consent, after SOS acceptance. Audio lasts up to 10 seconds and stops if this app leaves the foreground. Photos use the system camera preview. No continuous audio, background camera or retroactive inference upload. Local encrypted storage and format checks are a demo; MP4 and a production scanner are unavailable.</Text><View style={s.split}><Text style={s.body}>I consent to capture and share with selected contacts</Text><Switch accessibilityLabel="Consent to evidence capture" value={consent} onValueChange={setConsent}/></View>{event.recipients.map(r=><View style={s.split} key={r.id}><Text style={s.body}>Contact {r.priority_rank}</Text><Switch accessibilityLabel={'Share evidence with contact '+r.priority_rank} value={selected.includes(r.id)} onValueChange={v=>setSelected(v?[...selected,r.id]:selected.filter(id=>id!==r.id))}/></View>)}<Button title="Record up to 10 seconds of audio" disabled={busy||!consent||!selected.length} onPress={()=>capture('AUDIO')}/><Button title="Take a camera preview photo" disabled={busy||!consent||!selected.length} secondary onPress={()=>capture('PHOTO')}/><Button title="Withdraw evidence consent" secondary onPress={async()=>{setConsent(false);setBusy(true);try{await NativeSafety.stopEvidenceCapture();await api('/me/consents','PATCH',{version:'consent-v1',evidence:false});setMessage('Evidence access revoked.');await refresh();}catch{setMessage('Withdrawal unconfirmed; reconnect and retry.');}finally{setBusy(false);}}}/>{!!message&&<Text accessibilityLiveRegion="polite" style={s.notice}>{message}</Text>}{event.evidence.map(a=><View key={a.id} style={s.row}><Text style={s.small}>{a.kind} · {a.status}</Text><Button title={'Delete '+a.kind.toLowerCase()+' evidence'} secondary disabled={a.status==='DELETED'} onPress={async()=>{try{await api('/evidence/'+a.id,'DELETE');await refresh();}catch{setMessage('Deletion not confirmed. Retry.');}}}/></View>)}</Card>;
}
