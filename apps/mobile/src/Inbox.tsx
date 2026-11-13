import React,{useEffect,useRef,useState} from 'react';
import {Alert,Linking,Text,View} from 'react-native';
import {api,type Model} from './api';
import {useForeground,type ReceiverState} from './receiver';
import {Button,Card,Disclosure,Field,s} from './components';

const person=(name:string)=>name.trim()||'A trusted contact';
export function Inbox({inbox}:{inbox:ReceiverState}){
 const [selected,setSelected]=useState<string|null>(null),[detail,setDetail]=useState<Model<'ReceivedAlertDetail'>|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[eta,setEta]=useState(''),[version,reload]=useState(0),[changing,setChanging]=useState(false),[loadError,setLoadError]=useState('');
 const foreground=useForeground(),generation=useRef(0);
 useEffect(()=>{const n=++generation.current;return()=>{if(generation.current===n)generation.current++;};},[]);
 useEffect(()=>{
  setDetail(null);if(!selected||!foreground)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  async function load(){
   let retry=true;
   try{const value=await api<Model<'ReceivedAlertDetail'>>('/received-alerts/'+selected);if(!stopped){setDetail(value);setLoadError('');inbox.opened(selected!);}}
   catch(e){if(!stopped){setDetail(null);const code=e&&typeof e==='object'&&'code' in e?String(e.code):String(e);const terminal=/GRANT_(REVOKED|EXPIRED)|NOT_FOUND|FORBIDDEN/.test(code);setLoadError(terminal?'Sharing has ended. This location is no longer available.':'Connection lost. Location hidden until we reconnect.');retry=!terminal;}}
   finally{if(!stopped&&retry)timer=setTimeout(()=>{void load();},2000);}
  }
  void load();return()=>{stopped=true;clearTimeout(timer);};
 },[selected,foreground,version]);
 async function perform(action:()=>Promise<unknown>,success:string){
  const expected=generation.current;setBusy(true);setMessage('');
  try{await action();if(generation.current===expected){setMessage(success);inbox.reload();reload(n=>n+1);}}
  catch{if(generation.current===expected)setMessage('Could not confirm that change. Check your connection and try again.');}
  finally{if(generation.current===expected)setBusy(false);}
 }
 const view=foreground?detail?.event??detail?.journey:null,position=view?.position;
 async function maps(){if(position)await Linking.openURL('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(position.lat+','+position.lon));}
 async function respond(canAssist:boolean){
  if(!selected||!detail?.event)return;
  const grantId=selected,name=person(detail.event.shared_name),expected=generation.current;
  await perform(async()=>{
   await api('/received-alerts/'+grantId+'/acknowledge','POST',{can_assist:canAssist,...(canAssist&&eta!==''?{eta_minutes:Number(eta)}:{})});
   if(generation.current!==expected)return;
   inbox.responded(grantId,canAssist?'CAN_ASSIST':'CANNOT_ASSIST');
   setSelected(null);setDetail(null);setChanging(false);setLoadError('');
  },canAssist?'Your response is saved. '+name+' can see that you are on your way.':'Your response is saved. '+name+' can see that you cannot help.');
 }
 return <>
  <Text style={s.small}>Invitations and alerts sent to your signed-in number.</Text>
  {!!inbox.error&&<Text accessibilityLiveRegion="polite" style={s.error}>{inbox.error}</Text>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={s.notice}>{message}</Text>}
  {!!loadError&&selected&&<Text accessibilityRole="alert" style={s.error}>{loadError}</Text>}
  {selected?<>
   <Button title="Back to inbox" secondary onPress={()=>{setSelected(null);setDetail(null);setMessage('');}}/>
   {view&&<Card title={person(view.shared_name)}>
    <Text style={s.pill}>{detail?.event?'Needs help':'Sharing a journey'}</Text>
    <Text style={s.body}>{detail?.event?'SOS started '+new Date(detail.event.started_at).toLocaleString():'Expected arrival '+new Date(detail!.journey!.expected_arrival_at).toLocaleTimeString()}</Text>
    <Text style={s.body}>{position?'Last shared location: '+new Date(position.captured_at).toLocaleString():'No location shared yet.'}</Text>
    {position&&<><Text style={s.small}>Last known location; it may have changed.{position.accuracy_m!==null?' Accuracy about '+Math.round(position.accuracy_m)+' m.':''}</Text><Button title="View shared location in Maps" secondary onPress={()=>{void perform(maps,'');}}/></>}
    {detail?.event&&<><Text style={s.body}>{detail.event.own_acknowledgement==='CAN_ASSIST'?'Your response is saved: you are on your way.':detail.event.own_acknowledgement==='CANNOT_ASSIST'?'Your response is saved: you cannot help.':'Let them know if you can help.'} {detail.event.assisting_count} contact(s) can help.</Text>{detail.event.own_acknowledgement==='PENDING'||changing?<><Field label="Minutes to arrive (optional)" value={eta} onChangeText={setEta} keyboardType="number-pad" maxLength={3}/><Button title="I can help" disabled={busy||(eta!==''&&(!/^\d+$/.test(eta)||Number(eta)>240))} onPress={()=>{void respond(true);}}/><Button title="I cannot help" secondary disabled={busy} onPress={()=>{void respond(false);}}/></>:<Button title="Change my response" secondary onPress={()=>setChanging(true)}/>}</>}
   </Card>}
  </>:<>
   {inbox.invitations.map(i=><Card key={i.invite_id} title={person(i.owner_display_name)+' invited you'}><Text style={s.body}>Accept to receive their emergency alerts and journeys they choose to share. This does not share your location.</Text><Button title="Accept invitation" disabled={busy} onPress={()=>{void perform(()=>api('/contacts/invitations/'+i.invite_id+'/accept','POST',{consent_version:'consent-v1'}),'Invitation accepted. You can now receive their alerts.');}}/><Button title="Decline invitation" secondary disabled={busy} onPress={()=>Alert.alert('Decline invitation?','This also blocks new invitations from this person until you unblock them.',[{text:'Keep',style:'cancel'},{text:'Decline',onPress:()=>{void perform(()=>api('/contacts/invitations/'+i.invite_id+'/decline','POST',{block_future_invites:true}),'Invitation declined.');}}])}/></Card>)}
   {inbox.alerts.map(a=><Card key={a.grant_id} title={person(a.shared_name)}><Text style={s.pill}>{a.kind!=='SOS_READ'?'Shared journey':a.own_acknowledgement==='CAN_ASSIST'?'You are on your way':a.own_acknowledgement==='CANNOT_ASSIST'?'You cannot assist':'Needs help'}</Text><Text style={s.small}>{new Date(a.started_at).toLocaleString()}</Text><Button title={a.kind!=='SOS_READ'?'Open shared journey':a.own_acknowledgement&&a.own_acknowledgement!=='PENDING'?'Open alert details':'Open received SOS'} onPress={()=>{setSelected(a.grant_id);setDetail(null);setMessage('');setLoadError('');setChanging(false);setEta('');}}/></Card>)}
   {inbox.updated&&!inbox.invitations.length&&!inbox.alerts.length&&<Card title="You’re all caught up"><Text style={s.body}>New invitations and active alerts will appear here automatically.</Text></Card>}
   {!!inbox.consents.length&&<Disclosure title="Who can send you alerts">{inbox.consents.map(c=><View key={c.contact_id} style={s.row}><Text style={s.body}>{person(c.owner_display_name)}</Text>{c.status==='VERIFIED'?<Button title={'Stop receiving from '+person(c.owner_display_name)} secondary disabled={busy} onPress={()=>Alert.alert('Stop receiving alerts?','Their active location sharing with you will end.',[{text:'Keep',style:'cancel'},{text:'Stop receiving',style:'destructive',onPress:()=>{void perform(()=>api('/contact-consents/'+c.contact_id,'DELETE'),'You stopped receiving their alerts.');}}])}/>:<><Text style={s.small}>You stopped receiving alerts.</Text><Button title={'Receive alerts from '+person(c.owner_display_name)+' again'} secondary disabled={busy} onPress={()=>Alert.alert('Receive their alerts again?','This allows their emergency alerts and journeys they choose to share. Your location stays private.',[{text:'Cancel',style:'cancel'},{text:'Accept',onPress:()=>{void perform(()=>api('/contact-consents/'+c.contact_id+'/reopen','POST',{consent_version:'consent-v1'}),'You can receive their alerts again.');}}])}/></>}</View>)}</Disclosure>}
  </>}
  <Button title="Check for updates" secondary disabled={busy} onPress={()=>{inbox.reload();reload(n=>n+1);}}/>
 </>;
}
