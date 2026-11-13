import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {api,type Model} from './api';
import {errorText} from './errors';

export function useForeground(){
 const [active,setActive]=useState((AppState.currentState??'active')==='active');
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>sub.remove();},[]);
 return active;
}
export function useReceiver(uid:string|null,onContacts:(items:Model<'Contact'>[])=>void){
 const foreground=useForeground();
 const [version,reload]=useState(0),[snapshot,setSnapshot]=useState<{uid:string;invitations:Model<'InvitationItem'>[];alerts:Model<'ReceivedAlert'>[];consents:Model<'ContactConsent'>[];updated:number}|null>(null);
 const [error,setError]=useState('');
 const answers=useRef<{uid:string|null;items:Map<string,'CAN_ASSIST'|'CANNOT_ASSIST'>}>({uid,items:new Map()});
 const seen=useRef<{uid:string|null;grants:Set<string>}>({uid,grants:new Set()});
 const [,updateSeen]=useState(0);
 if(answers.current.uid!==uid)answers.current={uid,items:new Map()};
 if(seen.current.uid!==uid)seen.current={uid,grants:new Set()};
 useEffect(()=>{
  if(!uid||!foreground)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  async function load(){
   try{
    const [i,a,c,own]=await Promise.all([api<Model<'Invitations'>>('/contacts/invitations'),api<Model<'ReceivedAlerts'>>('/received-alerts'),api<Model<'ContactConsents'>>('/contact-consents'),api<Model<'Contacts'>>('/contacts')]);
    if(!stopped){
     const alerts=a.items.map(item=>{
      const accepted=answers.current.items.get(item.grant_id);
      if(accepted&&item.own_acknowledgement==='PENDING')return {...item,own_acknowledgement:accepted};
      answers.current.items.delete(item.grant_id);return item;
     });
     setSnapshot({uid:uid!,invitations:i.items.filter(x=>x.status==='PENDING'),alerts,consents:c.items,updated:Date.now()});onContacts(own.items);setError('');
    }
   }catch(e){if(!stopped){setSnapshot(null);setError(errorText(e,'Connection lost. Reconnecting automatically…'));}}
   finally{if(!stopped)timer=setTimeout(()=>{void load();},2000);}
  }
  void load();return()=>{stopped=true;clearTimeout(timer);};
 },[uid,foreground,version,onContacts]);
 const current=foreground&&snapshot?.uid===uid?snapshot:null;
 function responded(grantId:string,answer:'CAN_ASSIST'|'CANNOT_ASSIST'){
  if(answers.current.uid!==uid)return;
  answers.current.items.set(grantId,answer);
  setSnapshot(value=>value?.uid===uid?{...value,alerts:value.alerts.map(item=>item.grant_id===grantId?{...item,own_acknowledgement:answer}:item)}:value);
 }
 function opened(grantId:string){if(seen.current.uid===uid&&!seen.current.grants.has(grantId)){seen.current.grants.add(grantId);updateSeen(n=>n+1);}}
 return {invitations:current?.invitations??[],alerts:current?.alerts??[],consents:current?.consents??[],updated:current?.updated??null,error:foreground?error:'Updates resume when you return to the app.',reload:()=>reload(n=>n+1),responded,opened,unseenJourneys:current?.alerts.filter(item=>item.kind==='JOURNEY_READ'&&!seen.current.grants.has(item.grant_id)).length??0};
}
export const needsResponse=(alert:Model<'ReceivedAlert'>)=>alert.kind==='SOS_READ'&&(!alert.own_acknowledgement||alert.own_acknowledgement==='PENDING');
export type ReceiverState=ReturnType<typeof useReceiver>;
